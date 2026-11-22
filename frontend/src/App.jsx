import { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import { useHashRoute, irPara } from './hooks/useHashRoute.js';
import Layout from './components/Layout.jsx';
import Carregando from './components/Carregando.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Imoveis from './pages/Imoveis.jsx';
import Pessoas from './pages/Pessoas.jsx';
import Contratos from './pages/Contratos.jsx';
import Vistorias from './pages/Vistorias.jsx';
import VistoriaDetalhe from './pages/VistoriaDetalhe.jsx';
import Chamados from './pages/Chamados.jsx';
import ChamadoDetalhe from './pages/ChamadoDetalhe.jsx';
import Laudo from './pages/Laudo.jsx';

const EQUIPE = ['funcionario'];
const TODOS = ['funcionario', 'proprietario', 'inquilino'];

const ROTAS = {
  dashboard: { titulo: 'Dashboard', perfis: TODOS, Pagina: Dashboard },
  imoveis: { titulo: 'Imóveis', perfis: EQUIPE, Pagina: Imoveis },
  pessoas: { titulo: 'Pessoas', perfis: EQUIPE, Pagina: Pessoas },
  contratos: { titulo: 'Contratos', perfis: EQUIPE, Pagina: Contratos },
  vistorias: { titulo: 'Vistorias', perfis: EQUIPE, Pagina: Vistorias, Detalhe: VistoriaDetalhe },
  chamados: { titulo: 'Chamados', perfis: TODOS, Pagina: Chamados, Detalhe: ChamadoDetalhe },
};

function Telas() {
  const { usuario, inicializando } = useAuth();
  const rota = useHashRoute();
  const definicao = ROTAS[rota.caminho];
  const permitido = Boolean(definicao) && usuario && definicao.perfis.includes(usuario.tipo);

  useEffect(() => {
    if (usuario && rota.caminho !== 'laudo' && !permitido) irPara('#/dashboard');
  }, [usuario, rota.caminho, permitido]);

  if (inicializando) return <Carregando />; 
  if (!usuario) return <Login />;

  if (rota.caminho === 'laudo') return <Laudo id={rota.id} />;
  if (!permitido) return null;

  const Tela = rota.id && definicao.Detalhe ? definicao.Detalhe : definicao.Pagina;
  return (
    <Layout rota={rota} titulo={definicao.titulo}>
      {/* key: ao trocar de tela, o React descarta o estado da anterior */}
      <Tela key={`${rota.caminho}/${rota.id ?? ''}`} id={rota.id} />
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Telas />
      </ToastProvider>
    </AuthProvider>
  );
}
