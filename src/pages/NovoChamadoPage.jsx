import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RichTextComposer from '../components/RichTextComposer';
import { createRequest, getRequestFormOptions } from '../services/mockApi';
import { useProfile } from '../contexts/ProfileContext';

const options = getRequestFormOptions();

const initialForm = {
  titulo: '',
  descricao: '',
  area: options.areas[0],
  servicoMacro: options.serviceMacros[0],
  servicoSubcategoria: options.serviceSubcategories[options.serviceMacros[0]][0],
  tipoDemanda: options.demandTypes[0],
  gmId: '',
};

export default function NovoChamadoPage() {
  const navigate = useNavigate();
  const { currentUser } = useProfile();
  const [form, setForm] = useState(initialForm);
  const [attachments, setAttachments] = useState([]);
  const [saving, setSaving] = useState(false);

  const availableSubcategories = useMemo(
    () => options.serviceSubcategories[form.servicoMacro] || [],
    [form.servicoMacro],
  );

  const onChange = (event) => {
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
    setSaving(true);
    const created = await createRequest({ ...form, attachments }, currentUser);
    navigate(`/solicitante/chamados/${created.id}`);
  };

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

        <button disabled={saving} className="btn btn-primary w-fit disabled:opacity-50">
          {saving ? 'Salvando...' : 'Abrir solicitação'}
        </button>
      </form>
    </section>
  );
}
