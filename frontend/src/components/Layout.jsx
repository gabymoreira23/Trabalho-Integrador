import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

const PAPEIS = { funcionario: 'Funcionário', proprietario: 'Proprietário', inquilino: 'Inquilino' };

// menu muda conforme o perfil
const MENU_EQUIPE = [['dashboard', 'Dashboard'], ['imoveis', 'Imóveis'], ['pessoas', 'Pessoas'], ['contratos', 'Contratos'], ['vistorias', 'Vistorias'], ['chamados', 'Chamados']];
const MENU_CLIENTE = [['dashboard', 'Início'], ['chamados', 'Meus chamados']];

export default function Layout({ rota, titulo, children }) {
  const { usuario, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const conteudoRef = useRef(null);

  const itens = usuario.tipo === 'funcionario' ? MENU_EQUIPE : MENU_CLIENTE;

  // ao trocar de tela atualiza o título da aba e leva o foco para o conteúdo
  useEffect(() => {
    document.title = `${titulo} — Fênix Imóveis`;
    conteudoRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [titulo, rota.id]);

  const fecharMenu = () => setMenuAberto(false);

  return (
    <div className={menuAberto ? 'corpo--menu-aberto' : ''}>
      <a className="pular" href="#conteudo" onClick={(e) => { e.preventDefault(); conteudoRef.current?.focus(); }}>
        Pular para o conteúdo
      </a>

      <header className="topo">
        <button type="button" className="topo__menu" id="botao-menu" aria-label="Abrir menu"
          aria-controls="menu-lateral" aria-expanded={menuAberto} onClick={() => setMenuAberto((aberto) => !aberto)}>
          <span aria-hidden="true">☰</span>
        </button>
        <p className="marca"><span className="marca__ponto" aria-hidden="true" /> Fênix Imóveis</p>
      </header>

      <div className="layout">
        <aside className="lateral" id="menu-lateral">
          <p className="marca marca--lateral"><span className="marca__ponto" aria-hidden="true" /> Fênix Imóveis</p>
          <nav aria-label="Navegação principal">
            <ul className="menu">
              {itens.map(([caminho, texto]) => (
                <li key={caminho}>
                  <a href={`#/${caminho}`} data-rota={caminho} aria-current={rota.caminho === caminho ? 'page' : undefined} onClick={fecharMenu}>
                    {texto}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="lateral__usuario">
            <p className="lateral__papel">{PAPEIS[usuario.tipo]}</p>
            <p className="lateral__nome">{usuario.nome}</p>
            <button type="button" className="botao botao--link" id="botao-sair" onClick={logout}>Sair</button>
          </div>
        </aside>
        {menuAberto && <div className="fundo-menu" onClick={fecharMenu} />}

        <div className="principal">
          <main className="conteudo" id="conteudo" tabIndex={-1} ref={conteudoRef}>{children}</main>
          <footer className="rodape"><p>© 2026 Fênix Imóveis · Chapecó/SC</p></footer>
        </div>
      </div>
    </div>
  );
}
