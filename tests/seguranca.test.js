// Testes unitários das proteções novas. NÃO precisam de banco de dados nem do servidor ligado.
// Rodar:  node --test tests/seguranca.test.js   (ou  npm test, que roda todos)
const test = require('node:test');
const assert = require('node:assert/strict');
const { dataReal } = require('../src/utils/validacao');
const { termoLike } = require('../src/utils/busca');
const { cabecalhosSeguranca, semCache, criarLimitador, limitarRequisicoes, protegerLogin } = require('../src/middlewares/seguranca');

// "res" falso: guarda o status, o corpo e os cabeçalhos; permite disparar o evento "finish"
function res() {
  const ouvintes = {};
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
    set(a, b) { if (typeof a === 'object') Object.assign(this.headers, a); else this.headers[a] = b; return this; },
    on(evento, fn) { ouvintes[evento] = fn; },
    terminar(codigo) { this.statusCode = codigo; if (ouvintes.finish) ouvintes.finish(); },
  };
}
const req = (o = {}) => ({ ip: '1.1.1.1', body: {}, ...o });

test.describe('dataReal (datas que existem de verdade)', () => {
  test('aceita datas válidas, inclusive 29/02 em ano bissexto', () => {
    for (const d of ['2026-11-22', '2024-02-29', '2026-12-31', '2000-02-29']) assert.equal(dataReal(d), true, d);
  });
  test('rejeita datas impossíveis ou mal formadas', () => {
    for (const d of ['2026-02-31', '2025-02-29', '2026-13-01', '2026-00-10', '2026-11-31', '22/11/2026', '2026-1-1', '', 'abc', null, undefined, 20261122, ['2026-01-01']]) {
      assert.equal(dataReal(d), false, String(d));
    }
  });
});

test.describe('termoLike (busca sem curingas)', () => {
  test('% e _ digitados viram texto comum', () => {
    assert.equal(termoLike('%'), '%\\%%');
    assert.equal(termoLike('_'), '%\\_%');
    assert.equal(termoLike('50%_off'), '%50\\%\\_off%');
  });
  test('barra invertida também é escapada', () => assert.equal(termoLike('a\\b'), '%a\\\\b%'));
  test('texto normal só ganha % nas pontas', () => assert.equal(termoLike('Rua das Flores'), '%Rua das Flores%'));
  test('limita a 100 caracteres e aceita valores que não são texto', () => {
    assert.equal(termoLike('x'.repeat(500)).length, 102);
    assert.equal(termoLike(['a', 'b']), '%a,b%');
  });
});

test.describe('cabeçalhos de segurança', () => {
  test('envia CSP restritiva, nosniff, anti-clickjacking e sem cache na API', () => {
    const r = res(); let passou = false;
    cabecalhosSeguranca(req(), r, () => { passou = true; });
    assert.ok(passou);
    assert.match(r.headers['Content-Security-Policy'], /default-src 'self'/);
    assert.match(r.headers['Content-Security-Policy'], /script-src 'self'/);
    assert.match(r.headers['Content-Security-Policy'], /frame-ancestors 'none'/);
    assert.equal(r.headers['X-Content-Type-Options'], 'nosniff');
    assert.equal(r.headers['X-Frame-Options'], 'DENY');
    const s = res(); semCache(req(), s, () => {});
    assert.equal(s.headers['Cache-Control'], 'no-store');
  });
});

test.describe('limitador e freio do login', () => {
  test('criarLimitador: libera até o máximo e depois bloqueia; zerar libera de novo', () => {
    const l = criarLimitador({ janelaMs: 60000, maximo: 3 });
    for (let i = 0; i < 2; i++) l.registrar('k');
    assert.equal(l.segundosRestantes('k'), 0);
    l.registrar('k');
    assert.ok(l.segundosRestantes('k') > 0);
    assert.equal(l.segundosRestantes('outra'), 0);
    l.zerar('k');
    assert.equal(l.segundosRestantes('k'), 0);
  });

  test('limitarRequisicoes: a 4ª requisição seguida leva 429', () => {
    const lim = limitarRequisicoes({ janelaMs: 60000, maximo: 3 });
    const resultados = [];
    for (let i = 0; i < 4; i++) { const r = res(); let p = false; lim(req({ ip: '9.9.9.9' }), r, () => { p = true; }); resultados.push({ p, r }); }
    assert.ok(resultados[0].p && resultados[1].p && resultados[2].p);
    assert.equal(resultados[3].p, false);
    assert.equal(resultados[3].r.statusCode, 429);
    assert.equal(resultados[3].r.body.codigo, 429);
  });

  test('protegerLogin: 5 senhas erradas (401) bloqueiam com 429, mesmo com a senha certa depois', () => {
    const freio = protegerLogin({ maximo: 5 });
    const tentar = (usuario, ip, statusFinal) => {
      const r = res(); let passou = false;
      freio(req({ ip, body: { usuario } }), r, () => { passou = true; });
      if (passou) r.terminar(statusFinal);
      return { passou, r };
    };
    for (let i = 0; i < 5; i++) assert.equal(tentar('maria', '3.3.3.3', 401).passou, true);
    const bloqueada = tentar('maria', '3.3.3.3', 200);
    assert.equal(bloqueada.passou, false);
    assert.equal(bloqueada.r.statusCode, 429);
    assert.match(bloqueada.r.body.erro, /minuto/);
    assert.ok(bloqueada.r.headers['Retry-After']);
    assert.equal(tentar('maria', '4.4.4.4', 200).passou, true); // outro endereço não é afetado
    assert.equal(tentar('joao', '3.3.3.3', 200).passou, true); // outro usuário no mesmo endereço também não
  });

  test('protegerLogin: maiúsculas/minúsculas contam como o mesmo usuário', () => {
    const freio = protegerLogin({ maximo: 3 });
    for (const nome of ['Admin', 'ADMIN', 'admin']) { const r = res(); freio(req({ body: { usuario: nome } }), r, () => {}); r.terminar(401); }
    const r = res(); let p = false; freio(req({ body: { usuario: 'aDmIn' } }), r, () => { p = true; });
    assert.equal(p, false);
    assert.equal(r.statusCode, 429);
  });

  test('protegerLogin: login correto zera o contador; erros que não são 401 não contam', () => {
    const freio = protegerLogin({ maximo: 3 });
    const rodar = (status) => { const r = res(); let p = false; freio(req({ body: { usuario: 'ana' } }), r, () => { p = true; }); if (p) r.terminar(status); return p; };
    rodar(401); rodar(401); rodar(200); // zera
    rodar(401); rodar(401);
    assert.equal(rodar(400), true); // 400 (corpo inválido) não conta
    assert.equal(rodar(403), true); // 403 (usuário desativado) não conta
  });

  test('protegerLogin: corpo ausente ou usuário que não é texto não quebra', () => {
    const freio = protegerLogin({ maximo: 5 });
    for (const body of [undefined, null, {}, { usuario: { $ne: 1 } }, { usuario: 123 }]) {
      const r = res(); let p = false;
      assert.doesNotThrow(() => freio({ ip: '7.7.7.7', body }, r, () => { p = true; }));
      assert.ok(p);
    }
  });
});
