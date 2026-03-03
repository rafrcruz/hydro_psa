import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RichTextComposer from '../components/RichTextComposer';
import { createRequest, getRequestFormOptions } from '../services/mockApi';
import { useProfile } from '../contexts/ProfileContext';

function makeInitialForm(options) {
  const defaultMacro = options.serviceMacros[0] || '';
  const defaultSubcategory = options.serviceSubcategories[defaultMacro]?.[0] || '';

  return {
    titulo: '',
    descricao: '',
    area: options.areas[0] || '',
    servicoMacro: defaultMacro,
    servicoSubcategoria: defaultSubcategory,
    tipoDemanda: options.demandTypes[0] || '',
    gmId: '',
  };
}

export default function NovoChamadoPage() {
  const navigate = useNavigate();
  const { currentUser } = useProfile();
  const [options, setOptions] = useState(null);
  const [form, setForm] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    getRequestFormOptions().then((loadedOptions) => {
      if (!mounted) {
        return;
      }
      setOptions(loadedOptions);
      setForm(makeInitialForm(loadedOptions));
    });

    return () => {
      mounted = false;
    };
  }, []);

  const availableSubcategories = useMemo(
    () => (options && form ? options.serviceSubcategories[form.servicoMacro] || [] : []),
    [options, form],
  );

  const onChange = (event) => {
    if (!options || !form) {
      return;
    }

    const { name, value } = event.target;
    if (name === 'servicoMacro') {
      const nextSubcategory = options.serviceSubcategories[value]?.[0] || '';
      setForm((prev) => ({ ...prev, servicoMacro: value, servicoSubcategoria: nextSubcategory }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onAttachmentChange = (event) => {
    const files = Array.from(event.target.files || []);
    setAttachments(files);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!form) {
      return;
    }

    setSaving(true);
    setError('');
    try {
      const created = await createRequest({ ...form, attachments }, currentUser);
      navigate(`/solicitante/chamados/${created.id}`);
    } catch (err) {
      setSaving(false);
      setError(err.message || 'Não foi possível abrir o chamado.');
    }
  };

  if (!options || !form) {
    return <p className="text-aluminium">Carregando...</p>;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-2xl">Abrir chamado</h2>
      <div className="card grid gap-2 p-3 text-sm text-mid-gray md:grid-cols-2">
        <p><strong>Solicitante:</strong> {currentUser.name}</p>
        <p><strong>Data de inclusão:</strong> {new Date().toLocaleString('pt-BR')}</p>
      </div>

      <form onSubmit={onSubmit} className="card grid gap-4 p-4">
        <label className="text-sm text-mid-gray">
          Título
          <input required name="titulo" value={form.titulo} onChange={onChange} className="input mt-1" />
        </label>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm text-mid-gray">
            Área
            <select name="area" value={form.area} onChange={onChange} className="input mt-1">
              {options.areas.map((area) => <option key={area} value={area}>{area}</option>)}
            </select>
          </label>

          <label className="text-sm text-mid-gray">
            Serviço Macro
            <select name="servicoMacro" value={form.servicoMacro} onChange={onChange} className="input mt-1">
              {options.serviceMacros.map((macro) => <option key={macro} value={macro}>{macro}</option>)}
            </select>
          </label>

          <label className="text-sm text-mid-gray">
            Subcategoria do Serviço
            <input
              name="servicoSubcategoria"
              value={form.servicoSubcategoria}
              onChange={onChange}
              className="input mt-1"
              list="subcategories"
              required
              placeholder={availableSubcategories.length ? 'Selecione uma subcategoria' : 'Nenhuma subcategoria ativa para este macro'}
            />
            <datalist id="subcategories">
              {availableSubcategories.map((subcategory) => <option key={subcategory} value={subcategory} />)}
            </datalist>
          </label>

          <label className="text-sm text-mid-gray">
            Tipo de Demanda
            <select name="tipoDemanda" value={form.tipoDemanda} onChange={onChange} className="input mt-1">
              {options.demandTypes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="text-sm text-mid-gray">
            GM / ServiceNow ID (opcional)
            <input name="gmId" value={form.gmId} onChange={onChange} className="input mt-1" placeholder="Ex.: GM-01234" />
          </label>

          <label className="text-sm text-mid-gray">
            Anexos (mock)
            <input type="file" multiple className="input mt-1" onChange={onAttachmentChange} />
          </label>
        </div>

        <div className="text-sm text-mid-gray">
          <p>Descrição</p>
          <div className="mt-1">
            <RichTextComposer
              value={form.descricao}
              onChange={(value) => setForm((prev) => ({ ...prev, descricao: value }))}
              placeholder="Descreva o contexto, impacto e o que precisa ser realizado..."
            />
          </div>
        </div>

        {attachments.length ? (
          <ul className="text-sm text-mid-gray">
            {attachments.map((item) => <li key={`${item.name}-${item.size}`}>{item.name} ({Math.round(item.size / 1024)} KB)</li>)}
          </ul>
        ) : null}

        {error ? <p className="rounded bg-bauxite/10 px-3 py-2 text-sm text-bauxite">{error}</p> : null}

        <button disabled={saving} className="btn btn-primary w-fit disabled:opacity-50">
          {saving ? 'Salvando...' : 'Abrir solicitação'}
        </button>
      </form>
    </section>
  );
}
