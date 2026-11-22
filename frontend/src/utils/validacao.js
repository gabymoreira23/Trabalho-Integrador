// Conferência do CPF no navegador (o servidor confere de novo).
export function cpfValido(cpf) {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (const n of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(cpf[i]) * (n + 1 - i);
    if (((soma * 10) % 11) % 10 !== Number(cpf[n])) return false;
  }
  return true;
}

export function validarDocumento(v) {
  if (v.length !== 11 && v.length !== 14) return 'Informe 11 dígitos (CPF) ou 14 dígitos (CNPJ).';
  if (v.length === 11 && !cpfValido(v)) return 'CPF inválido. Confira os números digitados.';
  return '';
}

export function validarTelefone(v) {
  if (v && v.length !== 10 && v.length !== 11) return 'Telefone deve ter 10 ou 11 dígitos (DDD + número).';
  return '';
}
