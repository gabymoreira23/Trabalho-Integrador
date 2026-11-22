import { useEffect, useState } from 'react';

export function useDebounce(valor, atrasoMs = 300) {
  const [valorAtrasado, setValorAtrasado] = useState(valor);

  useEffect(() => {
    const timer = setTimeout(() => setValorAtrasado(valor), atrasoMs);
    return () => clearTimeout(timer); // cada tecla nova cancela a espera anterior
  }, [valor, atrasoMs]);

  return valorAtrasado;
}
