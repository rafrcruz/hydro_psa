import { useEffect, useState } from 'react';
import {
  createServiceSubcategory,
  deactivateServiceSubcategory,
  getRequestFormOptions,
  getServiceCatalog,
  updateServiceSubcategory,
} from '../services/mockApi';

export default function CatalogoPage() {
  const [catalog, setCatalog] = useState([]);
  const [serviceMacros, setServiceMacros] = useState([]);
  const [search, setSearch] = useState('');
  const [newMacro, setNewMacro] = useState('');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editingValue, setEditingValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadCatalog = async (searchText = search) => {
    const rows = await getServiceCatalog(searchText);
    setCatalog(rows);
  };

  useEffect(() => {
    let mounted = true;

    Promise.all([getRequestFormOptions(), getServiceCatalog('')]).then(([options, groupedCatalog]) => {
      if (!mounted) {
        return;
      }
      setServiceMacros(options.serviceMacros);
      setNewMacro(options.serviceMacros[0] || '');
      setCatalog(groupedCatalog);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }
    loadCatalog(search);
  }, [search]);

  const onCreate = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await createServiceSubcategory(newMacro, newName);
      setNewName('');
      await loadCatalog();
    } catch (err) {
      setError(err.message || 'Não foi possível adicionar a subcategoria.');
    }
  };

  const onStartEdit = (item) => {
    setEditingId(item.id);
    setEditingValue(item.name);
    setError('');
  };

  const onSaveEdit = async () => {
    if (!editingId) {
      return;
    }
    setError('');
    try {
      await updateServiceSubcategory(editingId, editingValue);
      setEditingId('');
      setEditingValue('');
      await loadCatalog();
    } catch (err) {
      setError(err.message || 'Não foi possível salvar a subcategoria.');
    }
  };

  const onDeactivate = async (itemId) => {
    setError('');
    try {
      await deactivateServiceSubcategory(itemId);
      if (editingId === itemId) {
        setEditingId('');
        setEditingValue('');
      }
      await loadCatalog();
    } catch (err) {
      setError(err.message || 'Não foi possível desativar a subcategoria.');
    }
  };

  if (loading) {
    return <p className="text-aluminium">Carregando...</p>;
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl">Catálogo de solicitações</h2>
        <p className="mt-1 text-sm text-aluminium">Gerencie subcategorias por Serviço Macro para abertura de chamados.</p>
      </header>

      <div className="card grid gap-4 p-4 md:grid-cols-2">
        <label className="text-sm text-mid-gray">
          Buscar subcategorias
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input mt-1"
            placeholder="Digite parte do nome..."
          />
        </label>

        <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm text-mid-gray">
            Serviço Macro
            <select value={newMacro} onChange={(event) => setNewMacro(event.target.value)} className="input mt-1">
              {serviceMacros.map((macro) => <option key={macro} value={macro}>{macro}</option>)}
            </select>
          </label>
          <label className="text-sm text-mid-gray">
            Nova subcategoria
            <input value={newName} onChange={(event) => setNewName(event.target.value)} className="input mt-1" placeholder="Ex.: PI Vision" />
          </label>
          <button type="submit" className="btn btn-primary mt-6 h-fit">Adicionar</button>
        </form>
      </div>

      {error ? <p className="rounded bg-bauxite/10 px-3 py-2 text-sm text-bauxite">{error}</p> : null}

      <div className="space-y-4">
        {catalog.map((group) => (
          <article key={group.macro} className="card p-4">
            <h3 className="mb-3 text-lg text-hydro-blue">{group.macro}</h3>
            {group.subcategories.length ? (
              <ul className="space-y-2">
                {group.subcategories.map((item) => (
                  <li key={item.id} className="grid gap-2 rounded border border-light-gray p-3 md:grid-cols-[1fr_auto] md:items-center">
                    <div className="flex flex-wrap items-center gap-2">
                      {editingId === item.id ? (
                        <input
                          className="input max-w-md"
                          value={editingValue}
                          onChange={(event) => setEditingValue(event.target.value)}
                        />
                      ) : (
                        <span className="font-semibold text-mid-gray">{item.name}</span>
                      )}
                      <span className={`rounded px-2 py-0.5 text-xs ${item.active ? 'bg-green text-white' : 'bg-light-gray text-mid-gray'}`}>
                        {item.active ? 'Ativa' : 'Desativada'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {editingId === item.id ? (
                        <>
                          <button type="button" className="btn btn-secondary" onClick={onSaveEdit}>Salvar</button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              setEditingId('');
                              setEditingValue('');
                              setError('');
                            }}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="btn btn-secondary" onClick={() => onStartEdit(item)}>Editar</button>
                          {item.active ? (
                            <button type="button" className="btn btn-secondary" onClick={() => onDeactivate(item.id)}>Desativar</button>
                          ) : null}
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-aluminium">Nenhuma subcategoria encontrada para este macro.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
