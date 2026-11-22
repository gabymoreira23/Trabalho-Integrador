// Testes de integração da API (PostgreSQL). Usam um banco separado ("fenix_test"), recriado a cada execução.
// Rodar:  npm test      (precisa do PostgreSQL rodando e do .env com DB_USER/DB_PASSWORD)
const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.DB_NAME = 'fenix_test';
process.env.JWT_SECRET = 'segredo-de-teste-com-mais-de-trinta-e-dois-caracteres';
process.env.REFRESH_SECRET = 'outro-segredo-de-teste-bem-diferente-do-primeiro-acesso';
process.env.NODE_ENV = 'test';
require('dotenv').config({ quiet: true }); // só preenche DB_USER/DB_PASSWORD (não sobrescreve o que já foi definido)

const { executar } = require('../database/executar-sql');
const app = require('../src/app');
const db = require('../src/database/models');

let servidor;
let base;

test.before(async () => {
  await executar('fenix_test'); // cria o banco de teste e carrega o fenix.sql
  await new Promise((ok) => { servidor = app.listen(0, ok); });
  base = `http://localhost:${servidor.address().port}`;
});
test.after(async () => {
  servidor.close();
  await db.sequelize.close();
});

// Cliente HTTP mínimo: guarda o access token (como o frontend, em memória) e o cookie do refresh token.
function cliente() {
  let cookie = '';
  let token = null;
  const chamar = async (metodo, url, corpo) => {
    const r = await fetch(base + url, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(cookie && { Cookie: cookie }),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const set = r.headers.get('set-cookie');
    if (set) { const par = set.split(';')[0]; cookie = par.endsWith('=') ? '' : par; }
    const texto = await r.text();
    return { status: r.status, corpo: texto ? JSON.parse(texto) : null, headers: r.headers };
  };
  return {
    get: (u) => chamar('GET', u),
    post: (u, c) => chamar('POST', u, c),
    put: (u, c) => chamar('PUT', u, c),
    del: (u) => chamar('DELETE', u),
    get cookie() { return cookie; },
    set cookie(v) { cookie = v; },
    get token() { return token; },
    set token(v) { token = v; },
    async entrar(usuario, senha) {
      const r = await chamar('POST', '/auth/login', { usuario, senha });
      assert.equal(r.status, 200);
      token = r.corpo.accessToken;
      return this;
    },
  };
}
const funcionario = () => cliente().entrar('admin', 'admin123');
const inquilino = () => cliente().entrar('maria', 'maria123');

test.describe('Autenticação (JWT + refresh token)', () => {
  test('login devolve access token no corpo e refresh token em cookie HttpOnly', async () => {
    const c = cliente();
    const r = await c.post('/auth/login', { usuario: 'admin', senha: 'admin123' });
    assert.equal(r.status, 200);
    assert.ok(r.corpo.accessToken);
    assert.equal(r.corpo.pessoa.tipo, 'funcionario');
    const cookieHeader = r.headers.get('set-cookie');
    assert.match(cookieHeader, /refreshToken=/);
    assert.match(cookieHeader, /HttpOnly/i);
    assert.match(cookieHeader, /SameSite=Strict/i);
    assert.match(cookieHeader, /Path=\/auth/i);
  });
  test('o payload do JWT guarda só id e tipo (sem dados sensíveis)', async () => {
    const c = await funcionario();
    const payload = jwt.decode(c.token);
    assert.deepEqual(Object.keys(payload).sort(), ['exp', 'iat', 'id', 'tipo']);
  });
  test('senha errada e usuário inexistente dão a mesma resposta 401', async () => {
    const a = await cliente().post('/auth/login', { usuario: 'admin', senha: 'errada' });
    const b = await cliente().post('/auth/login', { usuario: 'naoexiste', senha: 'qualquer' });
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
    assert.deepEqual(a.corpo, b.corpo);
  });
  test('login sem campos retorna 400', async () => {
    assert.equal((await cliente().post('/auth/login', {})).status, 400);
  });
  test('rota protegida sem token retorna 401', async () => {
    assert.equal((await cliente().get('/chamados')).status, 401);
    assert.equal((await cliente().get('/dashboard')).status, 401);
    assert.equal((await cliente().get('/pessoas')).status, 401);
  });
  test('token adulterado ou assinado com "none" é rejeitado', async () => {
    const c = cliente();
    c.token = 'abc.def.ghi';
    assert.equal((await c.get('/chamados')).status, 401);
    const semAssinatura = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"id":1,"tipo":"funcionario"}').toString('base64url')}.`;
    c.token = semAssinatura;
    assert.equal((await c.get('/pessoas')).status, 401);
  });
  test('access token expirado -> 401 com expirado:true (o frontend usa para renovar)', async () => {
    const c = cliente();
    c.token = jwt.sign({ id: 1, tipo: 'funcionario' }, process.env.JWT_SECRET, { expiresIn: -10 });
    const r = await c.get('/chamados');
    assert.equal(r.status, 401);
    assert.equal(r.corpo.expirado, true);
  });
  test('refresh renova o access token e rotaciona o refresh token', async () => {
    const c = await funcionario();
    const cookieAntigo = c.cookie;
    const r = await c.post('/auth/refresh');
    assert.equal(r.status, 200);
    assert.ok(r.corpo.accessToken);
    assert.notEqual(c.cookie, cookieAntigo); // cookie novo
    c.token = r.corpo.accessToken;
    assert.equal((await c.get('/auth/me')).status, 200);
  });
  test('reutilizar um refresh token já usado revoga TODA a sessão (detecção de roubo)', async () => {
    const c = await funcionario();
    const cookieAntigo = c.cookie;
    assert.equal((await c.post('/auth/refresh')).status, 200); // uso legítimo
    const cookieNovo = c.cookie;
    c.cookie = cookieAntigo; // "atacante" reapresenta o token antigo
    const r = await c.post('/auth/refresh');
    assert.equal(r.status, 403);
    c.cookie = cookieNovo; // o token novo também foi revogado
    assert.equal((await c.post('/auth/refresh')).status, 403);
  });
  test('refresh sem cookie -> 401', async () => {
    assert.equal((await cliente().post('/auth/refresh')).status, 401);
  });
  test('logout revoga o refresh token e limpa o cookie', async () => {
    const c = await funcionario();
    const cookieAntigo = c.cookie;
    assert.equal((await c.post('/auth/logout')).status, 204);
    assert.equal(c.cookie, ''); // cookie limpo
    c.cookie = cookieAntigo;
    assert.equal((await c.post('/auth/refresh')).status, 403); // não renova mais
  });
  test('usuário desativado perde o acesso imediatamente, mesmo com token válido', async () => {
    const admin = await funcionario();
    const pedro = await cliente().entrar('pedro', 'pedro123');
    assert.equal((await pedro.get('/chamados')).status, 200);
    const atual = (await admin.get('/pessoas/7')).corpo;
    await admin.put('/pessoas/7', { ...atual, senha: '', ativo: false });
    assert.equal((await pedro.get('/chamados')).status, 401);
    assert.equal((await cliente().post('/auth/login', { usuario: 'pedro', senha: 'pedro123' })).status, 403);
    await admin.put('/pessoas/7', { ...atual, senha: '', ativo: true }); // reativa para os outros testes
    assert.equal((await pedro.get('/chamados')).status, 200);
  });
  test('resposta nunca expõe senha_hash', async () => {
    const c = await funcionario();
    const r = await c.get('/pessoas');
    assert.ok(r.corpo.length > 0);
    assert.ok(r.corpo.every((p) => !('senha_hash' in p)));
    assert.ok(!('senha_hash' in (await c.get('/pessoas/1')).corpo));
  });
});

test.describe('Autorização por perfil', () => {
  test('cliente recebe 403 nos recursos da equipe', async () => {
    const c = await inquilino();
    for (const rota of ['/pessoas', '/imoveis', '/contratos', '/vistorias']) {
      assert.equal((await c.get(rota)).status, 403, rota);
    }
    assert.equal((await c.post('/pessoas', {})).status, 403);
    assert.equal((await c.del('/imoveis/1')).status, 403);
  });
  test('cliente não pode alterar nem excluir chamado (só a equipe)', async () => {
    const c = await inquilino();
    assert.equal((await c.put('/chamados/1', { status: 'concluido' })).status, 403);
    assert.equal((await c.del('/chamados/1')).status, 403);
  });
  test('cliente só vê os próprios chamados', async () => {
    const maria = await inquilino();
    const lista = (await maria.get('/chamados')).corpo;
    assert.ok(lista.length > 0);
    assert.ok(lista.every((c) => c.solicitante_nome === 'Maria Souza'));
    // tentar forçar o filtro de outro solicitante não funciona
    const forcado = (await maria.get('/chamados?solicitante_id=7')).corpo;
    assert.ok(forcado.every((c) => c.solicitante_nome === 'Maria Souza'));
  });
  test('cliente recebe 404 ao abrir chamado de outra pessoa', async () => {
    const maria = await inquilino();
    const pedro = await cliente().entrar('pedro', 'pedro123');
    const idDoPedro = (await pedro.get('/chamados')).corpo[0].id;
    assert.equal((await maria.get(`/chamados/${idDoPedro}`)).status, 404);
    assert.equal((await pedro.get(`/chamados/${idDoPedro}`)).status, 200);
  });
  test('cliente não abre chamado em imóvel sem vínculo', async () => {
    const maria = await inquilino();
    const r = await maria.post('/chamados', { imovel_id: 3, categoria: 'outros', urgencia: 'baixa', descricao: 'Imóvel que não é dela' });
    assert.equal(r.status, 403);
  });
  test('cliente abre chamado no próprio imóvel e ele aparece com histórico', async () => {
    const maria = await inquilino();
    const imoveis = (await maria.get('/chamados/imoveis')).corpo;
    assert.deepEqual(imoveis.map((i) => i.codigo), ['IMV-0101']);
    const r = await maria.post('/chamados', { imovel_id: imoveis[0].id, categoria: 'eletrica', urgencia: 'alta', descricao: 'Disjuntor desarmando' });
    assert.equal(r.status, 201);
    assert.equal(r.corpo.status, 'aberto');
    assert.equal(r.corpo.canal, 'sistema');
    assert.equal(r.corpo.historico.length, 1);
  });
});

test.describe('CT01 - Agendamento de vistoria (RF05)', () => {
  const valido = { imovel_id: 1, cliente_id: 6, responsavel_id: 2, tipo: 'entrada', data: '2026-11-20', horario: '14:00', observacoes: 'Verificar estado de conservação do imóvel.' };

  test('cenário 1: agendamento válido é registrado com todos os dados', async () => {
    const c = await funcionario();
    const r = await c.post('/vistorias', valido);
    assert.equal(r.status, 201);
    assert.equal(r.corpo.horario, '14:00');
    assert.equal(r.corpo.tipo, 'entrada');
    assert.equal(r.corpo.imovel_codigo, 'IMV-0101');
    assert.equal(r.corpo.status, 'agendada');
  });
  test('cenário 2: horário em branco é recusado com mensagem clara', async () => {
    const c = await funcionario();
    const r = await c.post('/vistorias', { ...valido, horario: '' });
    assert.equal(r.status, 400);
    assert.match(r.corpo.erro, /Horário é obrigatório/);
  });
  test('cenário 3: só aceita imóvel cadastrado', async () => {
    const c = await funcionario();
    const r = await c.post('/vistorias', { ...valido, imovel_id: 9999 });
    assert.equal(r.status, 400);
  });
});

test.describe('Fluxo completo da vistoria (RF06 a RF10)', () => {
  test('checklist -> parecer -> orçamento -> assinaturas -> laudo', async () => {
    const c = await funcionario();
    const { corpo: v } = await c.post('/vistorias', { imovel_id: 3, cliente_id: 7, responsavel_id: 3, tipo: 'final', data: '2026-11-21', horario: '10:00' });

    // dependências: não dá para pular etapas
    assert.equal((await c.put(`/vistorias/${v.id}/parecer`, { conclusao: 'aprovada' })).status, 409);
    assert.equal((await c.put(`/vistorias/${v.id}/orcamento`, { reparos: [] })).status, 409);

    const itens = [{ comodo_item: 'Sala - Piso', estado: 'regular', observacoes: 'Riscos' }, { comodo_item: 'Cozinha - Pia', estado: 'ruim' }];
    assert.equal((await c.put(`/vistorias/${v.id}/checklist`, { itens })).corpo.itens.length, 2);
    assert.equal((await c.put(`/vistorias/${v.id}/checklist`, { itens: [{ comodo_item: 'X', estado: 'otimo' }] })).status, 400);

    assert.equal((await c.put(`/vistorias/${v.id}/parecer`, { conclusao: 'com_pendencias' })).status, 400); // exige pendências
    const p = await c.put(`/vistorias/${v.id}/parecer`, { conclusao: 'com_pendencias', pendencias: 'Pia com vazamento' });
    assert.equal(p.corpo.status, 'realizada');

    const o = await c.put(`/vistorias/${v.id}/orcamento`, { reparos: [{ item: 'Pia', descricao: 'Troca', valor: 180.5 }, { item: 'Piso', valor: 250 }] });
    assert.equal(o.corpo.total_orcamento, 430.5);

    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    assert.equal((await c.put(`/vistorias/${v.id}/assinatura`, { papel: 'cliente', nome: 'Pedro Rocha', imagem: 'data:text/html;base64,AAAA' })).status, 400);
    await c.put(`/vistorias/${v.id}/assinatura`, { papel: 'responsavel', nome: 'Ana Lima', imagem: png });
    const a = await c.put(`/vistorias/${v.id}/assinatura`, { papel: 'cliente', nome: 'Pedro Rocha', imagem: png });
    assert.equal(a.corpo.assinaturas.length, 2);

    const laudo = (await c.get(`/vistorias/${v.id}`)).corpo;
    assert.equal(laudo.itens.length, 2);
    assert.equal(laudo.reparos.length, 2);

    // vistoria que não é final não tem orçamento
    const { corpo: e } = await c.post('/vistorias', { imovel_id: 1, cliente_id: 6, responsavel_id: 2, tipo: 'entrada', data: '2026-11-22', horario: '08:00' });
    assert.equal((await c.put(`/vistorias/${e.id}/orcamento`, { reparos: [] })).status, 409);
  });
});

test.describe('CRUD - pessoas, imóveis, contratos', () => {
  test('pessoas: criar, validar, ordenar, filtrar, editar e excluir', async () => {
    const c = await funcionario();
    const nova = { nome: 'Teste da Silva', cpf_cnpj: '390.533.447-05', tipo: 'inquilino', usuario: 'teste', senha: 'senha123', email: 'teste@exemplo.com' };
    const r = await c.post('/pessoas', nova);
    assert.equal(r.status, 201);
    assert.equal(r.corpo.cpf_cnpj, '39053344705');
    assert.equal((await c.post('/pessoas', nova)).status, 409); // CPF/usuário duplicado
    assert.equal((await c.post('/pessoas', { ...nova, cpf_cnpj: '1', usuario: 'x1' })).status, 400);
    assert.equal((await c.post('/pessoas', { ...nova, cpf_cnpj: '52998224725', usuario: 'x2', senha: '' })).status, 400);
    assert.equal((await c.post('/pessoas', { ...nova, cpf_cnpj: '12345678900', usuario: 'x3' })).status, 400); // CPF com dígito verificador errado
    assert.equal((await c.post('/pessoas', { ...nova, cpf_cnpj: '11111111111', usuario: 'x4' })).status, 400); // sequência repetida
    assert.equal((await c.post('/pessoas', { ...nova, cpf_cnpj: '52998224725', usuario: 'x5', telefone: '499999999999' })).status, 400); // telefone com mais de 11 dígitos

    const ord = (await c.get('/pessoas?ordenar=nome&direcao=desc')).corpo.map((p) => p.nome);
    assert.deepEqual(ord, [...ord].sort().reverse().map((x) => x)); // já vem decrescente
    const filtro = (await c.get('/pessoas?tipo=proprietario')).corpo;
    assert.ok(filtro.length === 2 && filtro.every((p) => p.tipo === 'proprietario'));
    assert.equal((await c.get('/pessoas?busca=Teste%20da')).corpo.length, 1);

    const ed = await c.put(`/pessoas/${r.corpo.id}`, { ...nova, nome: 'Teste Editado', senha: '' });
    assert.equal(ed.corpo.nome, 'Teste Editado');
    // senha antiga continua valendo
    await cliente().entrar('teste', 'senha123');

    assert.equal((await c.del(`/pessoas/${r.corpo.id}`)).status, 204);
    assert.equal((await c.get(`/pessoas/${r.corpo.id}`)).status, 404);
  });
  test('não permite excluir pessoa com vínculos nem o próprio usuário', async () => {
    const c = await funcionario();
    const r = await c.del('/pessoas/4'); // João é dono de imóveis
    assert.equal(r.status, 409);
    assert.match(r.corpo.erro, /vinculado/);
    assert.ok(!/SQLITE|constraint/i.test(r.corpo.erro)); // sem detalhe técnico
    assert.equal((await c.del('/pessoas/1')).status, 400);
  });
  test('imóveis: CRUD, ordenação por mais de um campo e filtro', async () => {
    const c = await funcionario();
    const novo = { codigo: 'IMV-9999', endereco: 'Rua Nova, 1 - Centro', categoria: 'Casa', finalidade: 'aluguel', valor: 999.9, proprietario_id: 4 };
    const r = await c.post('/imoveis', novo);
    assert.equal(r.status, 201);
    assert.equal((await c.post('/imoveis', novo)).status, 409);
    assert.equal((await c.post('/imoveis', { ...novo, codigo: 'X', proprietario_id: 6 })).status, 400); // dono precisa ser proprietário
    const porValor = (await c.get('/imoveis?ordenar=valor&direcao=asc')).corpo.map((i) => i.valor);
    assert.deepEqual(porValor, [...porValor].sort((a, b) => a - b));
    const porCodigo = (await c.get('/imoveis?ordenar=codigo&direcao=desc')).corpo.map((i) => i.codigo);
    assert.deepEqual(porCodigo, [...porCodigo].sort().reverse());
    assert.ok((await c.get('/imoveis?finalidade=venda')).corpo.every((i) => i.finalidade === 'venda'));
    assert.equal((await c.put(`/imoveis/${r.corpo.id}`, { ...novo, valor: 1200 })).corpo.valor, 1200);
    assert.equal((await c.del(`/imoveis/${r.corpo.id}`)).status, 204);
  });
  test('ordenação por campo inválido/malicioso não quebra nem injeta SQL', async () => {
    const c = await funcionario();
    const r = await c.get('/imoveis?ordenar=valor;DROP%20TABLE%20imoveis&direcao=asc');
    assert.equal(r.status, 200);
    const busca = await c.get("/pessoas?busca=' OR 1=1 --");
    assert.equal(busca.status, 200);
    assert.equal(busca.corpo.length, 0);
    assert.ok((await c.get('/imoveis')).corpo.length > 0);
  });
  test('contratos: CRUD, regra de datas e sincronização da disponibilidade do imóvel', async () => {
    const c = await funcionario();
    const imv = (await c.post('/imoveis', { codigo: 'IMV-CT', endereco: 'Rua do Contrato, 5', categoria: 'Casa', finalidade: 'aluguel', valor: 1000, proprietario_id: 4 })).corpo;
    assert.equal(imv.disponivel, true);
    const base = { numero: 'CT-T-1', tipo: 'locacao', situacao: 'ativo', imovel_id: imv.id, inquilino_id: 6, data_inicio: '2026-01-01', data_fim: '2027-01-01', valor: 1000 };
    assert.equal((await c.post('/contratos', { ...base, data_fim: '2025-01-01' })).status, 400);
    const ct = await c.post('/contratos', base);
    assert.equal(ct.status, 201);
    assert.equal(ct.corpo.proprietario_id, 4); // derivado do imóvel
    assert.equal((await c.get(`/imoveis/${imv.id}`)).corpo.disponivel, false);
    await c.put(`/contratos/${ct.corpo.id}`, { ...base, situacao: 'encerrado' });
    assert.equal((await c.get(`/imoveis/${imv.id}`)).corpo.disponivel, true);
    assert.equal((await c.del(`/contratos/${ct.corpo.id}`)).status, 204);
  });
});

test.describe('Chamados: tratamento pela equipe (RF12, RF13, RF15)', () => {
  test('classificar, atribuir, andar e concluir gera histórico', async () => {
    const c = await funcionario();
    const { corpo: novo } = await c.post('/chamados', { imovel_id: 3, solicitante_id: 7, categoria: 'hidraulica', urgencia: 'media', descricao: 'Torneira pingando', canal: 'telefone' });
    assert.equal(novo.canal, 'telefone');
    assert.match(novo.historico[0].descricao, /telefone/);

    const a = await c.put(`/chamados/${novo.id}`, { prioridade: 'alta', responsavel_id: 2, prazo: '2026-11-30', status: 'em_analise', andamento: 'Técnico será acionado' });
    assert.equal(a.corpo.prioridade, 'alta');
    assert.equal(a.corpo.responsavel_nome, 'Carlos Pereira');
    assert.ok(a.corpo.historico.length >= 3);

    assert.equal((await c.put(`/chamados/${novo.id}`, { status: 'concluido' })).status, 400); // sem solução
    const fim = await c.put(`/chamados/${novo.id}`, { status: 'concluido', solucao: 'Troca de vedação' });
    assert.equal(fim.corpo.status, 'concluido');
    assert.ok(fim.corpo.data_conclusao);
    assert.equal((await c.put(`/chamados/${novo.id}`, { responsavel_id: 6 })).status, 400); // responsável precisa ser funcionário
  });
  test('filtros e ordenação de chamados', async () => {
    const c = await funcionario();
    assert.ok((await c.get('/chamados?status=concluido')).corpo.every((x) => x.status === 'concluido'));
    const porUrg = (await c.get('/chamados?ordenar=urgencia&direcao=desc')).corpo.map((x) => x.urgencia);
    const peso = { baixa: 1, media: 2, alta: 3 };
    assert.deepEqual(porUrg.map((u) => peso[u]), porUrg.map((u) => peso[u]).sort((a, b) => b - a));
    assert.ok((await c.get('/chamados?busca=ralo')).corpo.length >= 1);
  });
  test('excluir chamado remove também o histórico', async () => {
    const c = await funcionario();
    const { corpo: x } = await c.post('/chamados', { imovel_id: 1, solicitante_id: 6, categoria: 'outros', urgencia: 'baixa', descricao: 'Chamado para excluir' });
    assert.equal((await c.del(`/chamados/${x.id}`)).status, 204);
    assert.equal((await c.get(`/chamados/${x.id}`)).status, 404);
  });
});

test.describe('Dashboard', () => {
  test('equipe vê contagens de todas as tabelas, que mudam após alterações', async () => {
    const c = await funcionario();
    const antes = (await c.get('/dashboard')).corpo;
    assert.equal(antes.perfil, 'equipe');
    assert.ok(antes.totais.pessoas >= 7);
    assert.ok(antes.totais.imoveis >= 4);
    for (const k of ['imoveis', 'pessoas', 'contratos', 'vistorias', 'chamados']) assert.ok(k in antes.totais);
    await c.post('/chamados', { imovel_id: 1, solicitante_id: 6, categoria: 'outros', urgencia: 'alta', descricao: 'Novo chamado do teste' });
    const depois = (await c.get('/dashboard')).corpo;
    assert.equal(depois.totais.chamados, antes.totais.chamados + 1);
    assert.equal(depois.chamadosPorStatus.aberto, antes.chamadosPorStatus.aberto + 1);
  });
  test('cliente vê só o resumo dos próprios chamados', async () => {
    const d = (await (await inquilino()).get('/dashboard')).corpo;
    assert.equal(d.perfil, 'cliente');
    assert.equal(d.totais.pessoas, undefined);
    assert.ok(d.totais.chamados >= 3);
  });
});

test.describe('Tratamento de erros', () => {
  test('JSON malformado -> 400 com mensagem amigável', async () => {
    const r = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{quebrado' });
    assert.equal(r.status, 400);
    assert.match((await r.json()).erro, /JSON/);
  });
  test('rota inexistente -> 404 em JSON, id inválido -> 400, sem stack trace', async () => {
    const c = await funcionario();
    assert.equal((await c.get('/nada')).status, 404);
    const r = await c.get('/imoveis/abc');
    assert.equal(r.status, 400);
    assert.ok(!JSON.stringify(r.corpo).includes('at '));
  });
  test('não revela a tecnologia do servidor (X-Powered-By)', async () => {
    const r = await fetch(`${base}/`);
    assert.equal(r.headers.get('x-powered-by'), null);
  });
});
