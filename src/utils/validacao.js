// Validação e sanitização no servidor (a do navegador é só conveniência).
const { AppError } = require('./erros');

const vazio = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
const erro = (msg) => new AppError(400, msg);

function texto(v, campo, { min = 1, max = 255, obrigatorio = true } = {}) {
  if (vazio(v)) {
    if (obrigatorio) throw erro(`O campo ${campo} é obrigatório.`);
    return null;
  }
  if (typeof v !== 'string') throw erro(`O campo ${campo} é inválido.`);
  const t = v.trim();
  if (t.length < min) throw erro(`O campo ${campo} deve ter pelo menos ${min} caracteres.`);
  if (t.length > max) throw erro(`O campo ${campo} deve ter no máximo ${max} caracteres.`);
  return t;
}

function opcao(v, campo, permitidos, { obrigatorio = true } = {}) {
  if (vazio(v)) {
    if (obrigatorio) throw erro(`O campo ${campo} é obrigatório.`);
    return null;
  }
  if (!permitidos.includes(v)) throw erro(`O campo ${campo} possui um valor inválido.`);
  return v;
}

function id(v, campo, { obrigatorio = true } = {}) {
  if (vazio(v)) {
    if (obrigatorio) throw erro(`O campo ${campo} é obrigatório.`);
    return null;
  }
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw erro(`O campo ${campo} é inválido.`);
  return n;
}

function numero(v, campo, { min = 0, obrigatorio = true } = {}) {
  if (vazio(v)) {
    if (obrigatorio) throw erro(`O campo ${campo} é obrigatório.`);
    return null;
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < min) throw erro(`O campo ${campo} deve ser um número maior ou igual a ${min}.`);
  return Math.round(n * 100) / 100;
}

// Confere se a data existe de verdade. O Date.parse aceitaria 2026-02-31 e o PostgreSQL daria erro.
function dataReal(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

function data(v, campo, { obrigatorio = true } = {}) {
  if (vazio(v)) {
    if (obrigatorio) throw erro(`O campo ${campo} é obrigatório.`);
    return null;
  }
  if (!dataReal(v)) throw erro(`O campo ${campo} deve ser uma data válida.`);
  return v;
}

function horario(v, campo) {
  if (vazio(v)) throw erro(`O campo ${campo} é obrigatório.`);
  if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw erro(`O campo ${campo} deve ser um horário válido (HH:MM).`);
  return v;
}

function email(v, campo = 'E-mail', { obrigatorio = false } = {}) {
  const t = texto(v, campo, { max: 120, obrigatorio });
  if (t && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) throw erro(`O campo ${campo} deve ser um e-mail válido.`);
  return t;
}

// Confere os dois dígitos verificadores do CPF (e recusa sequências como 111.111.111-11).
function cpfValido(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (const n of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(cpf[i]) * (n + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(cpf[n])) return false;
  }
  return true;
}

// Guarda só os dígitos. CPF = 11 dígitos (com conferência dos dígitos verificadores), CNPJ = 14.
function documento(v, campo = 'CPF/CNPJ') {
  const t = texto(v, campo, { max: 30 });
  const digitos = t.replace(/\D/g, '');
  if (digitos.length !== 11 && digitos.length !== 14) throw erro(`O campo ${campo} deve ter 11 (CPF) ou 14 (CNPJ) dígitos.`);
  if (digitos.length === 11 && !cpfValido(digitos)) throw erro('CPF inválido. Confira os números digitados.');
  return digitos;
}

// Telefone opcional. Guarda só os dígitos: DDD + número (10 ou 11 dígitos).
function telefone(v, campo = 'Telefone') {
  const t = texto(v, campo, { obrigatorio: false, max: 30 });
  if (!t) return null;
  const digitos = t.replace(/\D/g, '');
  if (digitos.length !== 10 && digitos.length !== 11) throw erro(`O campo ${campo} deve ter 10 ou 11 dígitos (DDD + número).`);
  return digitos;
}

function booleano(v, padrao = true) {
  if (v === undefined || v === null || v === '') return padrao;
  return v === true || v === 1 || v === '1' || v === 'true';
}

const hoje = () => new Date().toISOString().slice(0, 10);

module.exports = { texto, opcao, id, numero, data, dataReal, horario, email, documento, cpfValido, telefone, booleano, hoje };
