
export const moeda = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const dataBR = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');

export function dataHoraBR(valor) {
  if (!valor) return '—';
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? valor : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function documentoBR(d) {
  if (!d) return '—';
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return d;
}

export function telefoneBR(t) {
  if (!t) return '';
  if (t.length === 11) return t.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (t.length === 10) return t.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return t;
}

export const hojeISO = () => new Date().toISOString().slice(0, 10);

export const numeroChamado = (id) => `#${String(id).padStart(4, '0')}`;
