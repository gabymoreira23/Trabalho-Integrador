import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useFormulario } from '../hooks/useFormulario.js';
import { useToast } from '../contexts/ToastContext.jsx';
import Modal from './Modal.jsx';
import Campo from './Campo.jsx';

function valoresIniciais(campos, item) {
  const valores = {};
  campos.forEach((c) => {
    const atual = item ? item[c.nome] : c.valorInicial;
    if (c.tipo === 'checkbox') valores[c.nome] = item ? Boolean(atual) : c.valorInicial !== false;
    else if (c.somenteDigitos) valores[c.nome] = atual == null ? '' : String(atual).replace(/\D/g, '').slice(0, c.max);
    else valores[c.nome] = atual === undefined || atual === null ? '' : String(atual);
  });
  return valores;
}

export default function FormularioCrud({ config, item, aoSalvar, aoFechar }) {
  const editando = Boolean(item);
  const { mostrar } = useToast();
  const { valores, setValores, handleChange } = useFormulario(() => valoresIniciais(config.campos, item));
  const [opcoes, setOpcoes] = useState(null); 
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Carrega as opções dos selects ao abrir o formulário.
  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      try {
        const listas = await Promise.all(config.campos.map((c) => (c.carregarOpcoes ? c.carregarOpcoes() : c.opcoes)));
        if (!cancelado) setOpcoes(listas);
      } catch (e) {
        if (!cancelado) {
          mostrar(e.message, 'erro');
          aoFechar();
        }
      }
    }
    carregar();
    return () => { cancelado = true; };
  }, [config.campos, mostrar, aoFechar]);

  // Campos "somenteDigitos": descarta letras/símbolos e corta no limite (também ao colar um CPF formatado).
  function aoAlterar(e) {
    const campo = config.campos.find((c) => c.nome === e.target.name);
    if (campo?.somenteDigitos) {
      const limpo = e.target.value.replace(/\D/g, '').slice(0, campo.max);
      setValores((v) => ({ ...v, [campo.nome]: limpo }));
      return;
    }
    handleChange(e);
  }

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    for (const c of config.campos) {
      const v = valores[c.nome];
      const obrigatorioAgora = c.obrigatorio && !(editando && c.soCriar);
      if (c.validar && (v !== '' || obrigatorioAgora)) {
        const msg = c.validar(v);
        if (msg) { setErro(msg); return; }
      }
    }
    const corpo = {};
    config.campos.forEach((c) => {
      const v = valores[c.nome];
      corpo[c.nome] = c.tipo === 'number' && v !== '' ? Number(v) : v;
    });
    setSalvando(true);
    try {
      await api(editando ? `${config.endpoint}/${item.id}` : config.endpoint, { metodo: editando ? 'PUT' : 'POST', corpo });
      mostrar(editando ? 'Alterações salvas.' : 'Registro criado com sucesso.');
      aoSalvar();
    } catch (e2) {
      setErro(e2.message);
      setSalvando(false);
    }
  }

  const titulo = editando ? `Editar — ${config.nomeItem ? config.nomeItem(item) : 'registro'}` : (config.rotuloNovo || 'Novo registro');

  return (
    <Modal titulo={titulo} largura="larga" aoFechar={aoFechar}>
      {opcoes === null ? (
        <p className="carregando">Carregando…</p>
      ) : (
        <form className="formulario" onSubmit={enviar}>
          {erro && <div className="alerta" role="alert">{erro}</div>}

          {config.campos.map((c, i) => {
            const id = `f-${c.nome}`;
            const obrigatorio = Boolean(c.obrigatorio) && !(editando && c.soCriar);

            if (c.tipo === 'checkbox') {
              return (
                <label key={c.nome} className="check campo--inteiro">
                  <input type="checkbox" name={c.nome} id={id} checked={valores[c.nome]} onChange={handleChange} />
                  <span>{c.rotulo}</span>
                </label>
              );
            }

            let controle;
            if (c.tipo === 'select') {
              const lista = [...(opcoes[i] || [])];
              const atual = valores[c.nome];
              if (atual !== '' && !lista.some(([v]) => String(v) === atual)) lista.push([atual, atual]); // valor antigo fora da lista
              controle = (
                <select id={id} name={c.nome} required={obrigatorio} value={valores[c.nome]} onChange={handleChange}>
                  <option value="">{c.obrigatorio ? 'Selecione…' : '— nenhum —'}</option>
                  {lista.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                </select>
              );
            } else if (c.tipo === 'textarea') {
              controle = (
                <textarea id={id} name={c.nome} rows={3} maxLength={c.max} placeholder={c.placeholder}
                  required={obrigatorio} value={valores[c.nome]} onChange={handleChange} />
              );
            } else {
              controle = (
                <input id={id} name={c.nome} type={c.tipo || 'text'} maxLength={c.somenteDigitos ? undefined : c.max} inputMode={c.somenteDigitos ? 'numeric' : undefined} min={c.min}
                  step={c.tipo === 'number' ? (c.step || 'any') : undefined} placeholder={c.placeholder}
                  autoComplete={c.tipo === 'password' ? 'new-password' : 'off'}
                  required={obrigatorio} value={valores[c.nome]} onChange={aoAlterar} />
              );
            }

            return (
              <Campo key={c.nome} rotulo={c.rotulo} obrigatorio={obrigatorio} inteira={c.tamanho === 'inteira'}
                dica={editando && c.dicaEdicao ? c.dicaEdicao : c.dica}>
                {controle}
              </Campo>
            );
          })}

          <div className="botoes campo--inteiro">
            <button type="button" className="botao botao--secundario" onClick={aoFechar}>Cancelar</button>
            <button type="submit" className="botao" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
