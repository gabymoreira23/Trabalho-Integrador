let accessToken = null;
let renovacaoEmAndamento = null; 

export class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem);
    this.status = status;
  }
}

// evento que o AuthProvider escuta para voltar a tela de login quando a sessão acaba
export const EVENTO_SESSAO_EXPIRADA = 'fenix:sessao-expirada';

async function enviar(caminho, { metodo = 'GET', corpo, params } = {}) {
  let url = caminho;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== '' && v != null) qs.set(k, v); });
    if ([...qs].length) url += `?${qs}`;
  }
  const cabecalhos = {};
  if (corpo) cabecalhos['Content-Type'] = 'application/json';
  if (accessToken) cabecalhos.Authorization = `Bearer ${accessToken}`;

  try {
    return await fetch(url, { method: metodo, headers: cabecalhos, body: corpo ? JSON.stringify(corpo) : undefined });
  } catch {
    throw new ErroApi('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.', 0);
  }
}

async function lerJson(resposta) {
  try { return await resposta.json(); } catch { return null; }
}


export function renovarSessao() {
  if (!renovacaoEmAndamento) {
    renovacaoEmAndamento = (async () => {
      const resposta = await enviar('/auth/refresh', { metodo: 'POST' });
      const dados = await lerJson(resposta);
      if (!resposta.ok) {
        accessToken = null;
        throw new ErroApi(dados?.erro || 'Sua sessão expirou. Faça login novamente.', resposta.status);
      }
      accessToken = dados.accessToken;
      return dados.pessoa;
    })().finally(() => { renovacaoEmAndamento = null; });
  }
  return renovacaoEmAndamento;
}

export async function entrar(usuario, senha) {
  const resposta = await enviar('/auth/login', { metodo: 'POST', corpo: { usuario, senha } });
  const dados = await lerJson(resposta);
  if (!resposta.ok) throw new ErroApi(dados?.erro || 'Não foi possível entrar. Tente novamente.', resposta.status);
  accessToken = dados.accessToken;
  return dados.pessoa;
}

export async function sair() {
  try { await enviar('/auth/logout', { metodo: 'POST' }); } catch { /* sai mesmo sem conexão */ }
  accessToken = null;
}

function avisarSessaoExpirada() {
  accessToken = null;
  window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA));
}


export async function api(caminho, opcoes = {}) {
  let resposta = await enviar(caminho, opcoes);
  let dados = resposta.status === 204 ? null : await lerJson(resposta);

  if (resposta.status === 401 && dados?.expirado) {
    try {
      await renovarSessao();
    } catch {
      avisarSessaoExpirada();
      throw new ErroApi('Sua sessão expirou. Faça login novamente.', 401);
    }
    resposta = await enviar(caminho, opcoes);
    dados = resposta.status === 204 ? null : await lerJson(resposta);
  }

  if (!resposta.ok) {
    if (resposta.status === 401) avisarSessaoExpirada(); // sem sessão válida
    throw new ErroApi(dados?.erro || 'Algo deu errado. Tente novamente.', resposta.status);
  }
  return dados;
}
