import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useFormulario } from '../hooks/useFormulario.js';
import Campo from '../components/Campo.jsx';

export default function Login() {
  const { login, aviso } = useAuth();
  const { valores, handleChange } = useFormulario({ usuario: '', senha: '' });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);

  useEffect(() => { document.title = 'Entrar — Fênix Imóveis'; }, []);

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    if (!valores.usuario.trim() || !valores.senha) {
      setErro('Informe usuário e senha.');
      return;
    }
    setEntrando(true);
    try {
      await login(valores.usuario.trim(), valores.senha);
      //o AuthProvider guarda o usuário e o App troca a tela sozinho
    } catch (e2) {
      setErro(e2.message);
      setEntrando(false);
    }
  }

  const mensagem = erro || aviso;

  return (
    <div className="corpo--login">
      <main className="login">
        <section className="login__cartao" aria-labelledby="titulo-login">
          <p className="marca"><span className="marca__ponto" aria-hidden="true" /> Fênix Imóveis</p>
          <h1 id="titulo-login">Bem-vindo de volta</h1>
          <p className="subtitulo">Acesse sua conta para continuar gerenciando seus imóveis.</p>

          <form onSubmit={enviar} noValidate>
            {mensagem && <div id="aviso-login" className="alerta" role="alert">{mensagem}</div>}

            <Campo rotulo="Login">
              <input id="usuario" name="usuario" type="text" autoComplete="username" placeholder="Digite seu login"
                required autoFocus value={valores.usuario} onChange={handleChange} />
            </Campo>
            <Campo rotulo="Senha">
              <input id="senha" name="senha" type={mostrarSenha ? 'text' : 'password'} autoComplete="current-password"
                placeholder="Digite sua senha" required value={valores.senha} onChange={handleChange} />
            </Campo>
            <label className="check">
              <input type="checkbox" id="mostrar-senha" checked={mostrarSenha} onChange={(e) => setMostrarSenha(e.target.checked)} />
              <span>Mostrar senha</span>
            </label>

            <button className="botao botao--bloco" type="submit" id="botao-entrar" disabled={entrando}>
              {entrando ? 'Entrando…' : 'Entrar na plataforma'}
            </button>
          </form>
        </section>
      </main>
      <footer className="login__rodape"><p>© 2026 Fênix Imóveis</p></footer>
    </div>
  );
}
