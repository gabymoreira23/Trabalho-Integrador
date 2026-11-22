import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { entrar, sair as encerrarSessao, renovarSessao, EVENTO_SESSAO_EXPIRADA } from '../services/api.js';

const AuthContexto = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContexto);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [inicializando, setInicializando] = useState(true);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    let cancelado = false;
    async function restaurar() {
      try {
        const pessoa = await renovarSessao();
        if (!cancelado) setUsuario(pessoa);
      } catch {
        // sem sessão válida segue para o login
      } finally {
        if (!cancelado) setInicializando(false);
      }
    }
    restaurar();
    return () => { cancelado = true; };
  }, []);

  // se a API avisar que a sessão acabou (token e refresh vencidos), volta ao login.
  useEffect(() => {
    function aoExpirar() {
      setUsuario(null);
      setAviso('Sua sessão expirou. Faça login novamente.');
    }
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar); // limpeza do listener
  }, []);

  const login = useCallback(async (nomeUsuario, senha) => {
    const pessoa = await entrar(nomeUsuario, senha); 
    setAviso('');
    setUsuario(pessoa);
  }, []);

  const logout = useCallback(async () => {
    await encerrarSessao();
    setUsuario(null);
    setAviso('');
  }, []);

  return (
    <AuthContexto.Provider value={{ usuario, inicializando, aviso, login, logout }}>
      {children}
    </AuthContexto.Provider>
  );
}
