import { useEffect, useState } from 'react';

function lerRota() {
  const [caminho = 'dashboard', id] = window.location.hash.replace(/^#\/?/, '').split('/');
  return { caminho: caminho || 'dashboard', id };
}

export function useHashRoute() {
  const [rota, setRota] = useState(lerRota);

  useEffect(() => {
    const aoMudar = () => setRota(lerRota());
    window.addEventListener('hashchange', aoMudar);
    return () => window.removeEventListener('hashchange', aoMudar);
  }, []);

  return rota;
}

export const irPara = (destino) => { window.location.hash = destino; };
