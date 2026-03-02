import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRequest } from '../services/mockApi';
import { useProfile } from '../contexts/ProfileContext';

const initialForm = {
  title: '',
  category: 'Acesso',
  priority: 'Media',
  description: '',
};

export default function NovoChamadoPage() {
  const navigate = useNavigate();
  const { currentUser } = useProfile();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const created = await createRequest(form, currentUser.id);
    navigate(`/solicitante/chamados/${created.id}`);
  };

  return (
    <section className="space-y-3">
      <h2 className="text-2xl">Novo chamado</h2>
      <form onSubmit={onSubmit} className="card grid gap-4 p-4">
        <label className="text-sm text-mid-gray">
          Titulo
          <input required name="title" value={form.title} onChange={onChange} className="input mt-1" />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-mid-gray">
            Categoria
            <select name="category" value={form.category} onChange={onChange} className="input mt-1">
              <option value="Acesso">Acesso</option>
              <option value="Onboarding">Onboarding</option>
              <option value="Automacao">Automacao</option>
              <option value="Infra">Infra</option>
            </select>
          </label>
          <label className="text-sm text-mid-gray">
            Prioridade
            <select name="priority" value={form.priority} onChange={onChange} className="input mt-1">
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baixa">Baixa</option>
            </select>
          </label>
        </div>
        <label className="text-sm text-mid-gray">
          Descrição
          <textarea required name="description" value={form.description} onChange={onChange} className="input mt-1 min-h-32" />
        </label>
        <button disabled={saving} className="btn btn-primary w-fit disabled:opacity-50">
          {saving ? 'Salvando...' : 'Abrir solicitação'}
        </button>
      </form>
    </section>
  );
}

