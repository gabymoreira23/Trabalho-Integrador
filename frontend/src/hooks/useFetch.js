import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api.js';

export function useFetch(caminho, params, { intervalo } = {}) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);
  const [tentativa, setTentativa] = useState(0);
  const [atualizadoEm, setAtualizadoEm] = useState(null);

  const chave = JSON.stringify(params ?? {});

  const recarregar = useCallback(() => setTentativa((t) => t + 1), []);

  useEffect(() => {
    if (!caminho) return undefined;
    let cancelado = false; 
    setErro(null);

    async function buscar() {
      try {
        const resultado = await api(caminho, { params: JSON.parse(chave) });
        if (!cancelado) {
          setDados(resultado);
          setErro(null);
          setAtualizadoEm(new Date());
        }
      } catch (e) {
        if (!cancelado) setErro(e);
      }
    }
    buscar();
    return () => { cancelado = true; };
  }, [caminho, chave, tentativa]);

  
  useEffect(() => {
    if (!caminho || !intervalo) return undefined;
    const timer = setInterval(() => { if (!document.hidden) recarregar(); }, intervalo);
    return () => clearInterval(timer);
  }, [caminho, intervalo, recarregar]);

  const carregando = Boolean(caminho) && dados === null && erro === null;

  return { dados, erro, carregando, recarregar, atualizadoEm };
}
