import { createContext, useCallback, useContext, useState } from 'react';

const ToastContexto = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContexto);
  if (!ctx) throw new Error('useToast fora do ToastProvider');
  return ctx;
}

let proximoId = 1;


export function ToastProvider({ children }) {
  const [avisos, setAvisos] = useState([]);

  const mostrar = useCallback((mensagem, tipo = 'ok') => {
    const id = proximoId++;
    setAvisos((atuais) => [...atuais, { id, mensagem, tipo }]);
    setTimeout(() => setAvisos((atuais) => atuais.filter((a) => a.id !== id)), tipo === 'erro' ? 7000 : 3500);
  }, []);

  return (
    <ToastContexto.Provider value={{ mostrar }}>
      {children}
      <div className="toasts" aria-live="polite">
        {avisos.map((a) => (
          <div key={a.id} className={`toast toast--${a.tipo}`} role={a.tipo === 'erro' ? 'alert' : 'status'}>
            {a.mensagem}
          </div>
        ))}
      </div>
    </ToastContexto.Provider>
  );
}
