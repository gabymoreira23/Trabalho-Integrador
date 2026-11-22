import { useState } from 'react';

export function useFormulario(valoresIniciais) {
  const [valores, setValores] = useState(valoresIniciais);

  function handleChange(e) {
    const { name, type, value, checked } = e.target;
    setValores((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
  }

  function resetar() {
    setValores(typeof valoresIniciais === 'function' ? valoresIniciais() : valoresIniciais);
  }

  return { valores, setValores, handleChange, resetar };
}
