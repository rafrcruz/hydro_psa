import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  FilterX,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Save,
  Search,
  X,
} from 'lucide-react';
import {
  createServiceSubcategory,
  deactivateServiceSubcategory,
  getRequestFormOptions,
  getServiceCatalog,
  reactivateServiceSubcategory,
  updateServiceSubcategory,
} from '../services/mockApi';

function getFeedbackClass(type) {
  if (type === 'success') {
    return 'bg-green/10 text-green';
  }
  if (type === 'error') {
    return 'bg-bauxite/10 text-bauxite';
  }
  return 'bg-hydro-light-blue/15 text-hydro-blue';
}

function getMacroCardClass(isSelected) {
  if (isSelected) {
    return 'border-hydro-blue bg-hydro-blue text-white shadow-sm';
  }
  return 'border-light-gray bg-white hover:border-hydro-light-blue hover:shadow-sm';
}

export default function CatalogoPage() {
  const [catalog, setCatalog] = useState([]);
  const [serviceMacros, setServiceMacros] = useState([]);
  const [selectedMacro, setSelectedMacro] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortMode, setSortMode] = useState('ACTIVE_FIRST');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState('');
  const [editingValue, setEditingValue] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [confirmState, setConfirmState] = useState({
    open: false,
    action: 'DEACTIVATE',
    mode: 'BATCH',
    item: null,
    affectedCount: 0,
  });

  const loadCatalog = async () => {
    const rows = await getServiceCatalog('');
    setCatalog(rows);
  };

  useEffect(() => {
    let mounted = true;

    Promise.all([getRequestFormOptions(), getServiceCatalog('')]).then(([options, groupedCatalog]) => {
      if (!mounted) {
        return;
      }
      setServiceMacros(options.serviceMacros);
      setSelectedMacro(options.serviceMacros[0] || '');
      setCatalog(groupedCatalog);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const catalogByMacro = useMemo(
    () => catalog.reduce((acc, group) => ({ ...acc, [group.macro]: group.subcategories }), {}),
    [catalog],
  );

  const selectedItems = useMemo(() => catalogByMacro[selectedMacro] || [], [catalogByMacro, selectedMacro]);
  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedRows = useMemo(
    () => selectedItems.filter((item) => selectedIdsSet.has(item.id)),
    [selectedIdsSet, selectedItems],
  );

  const selectedActiveCount = useMemo(() => selectedRows.filter((item) => item.active).length, [selectedRows]);
  const selectedInactiveCount = useMemo(() => selectedRows.filter((item) => !item.active).length, [selectedRows]);

  const macroSummary = useMemo(() => {
    const total = selectedItems.length;
    const active = selectedItems.filter((item) => item.active).length;
    return {
      total,
      active,
      inactive: total - active,
    };
  }, [selectedItems]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return selectedItems
      .filter((item) => {
        if (statusFilter === 'ACTIVE' && !item.active) {
          return false;
        }
        if (statusFilter === 'INACTIVE' && item.active) {
          return false;
        }
        if (!normalizedSearch) {
          return true;
        }
        return item.name.toLowerCase().includes(normalizedSearch);
      })
      .sort((a, b) => {
        if (sortMode === 'ACTIVE_FIRST') {
          return Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
        }
        return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
      });
  }, [search, selectedItems, sortMode, statusFilter]);

  const filteredIds = useMemo(() => filteredItems.map((item) => item.id), [filteredItems]);

  const isAllFilteredSelected = useMemo(
    () => filteredIds.length > 0 && filteredIds.every((id) => selectedIdsSet.has(id)),
    [filteredIds, selectedIdsSet],
  );

  useEffect(() => {
    if (!selectedItems.find((item) => item.id === editingId)) {
      setEditingId('');
      setEditingValue('');
    }

    const validIds = new Set(selectedItems.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [editingId, selectedItems]);

  useEffect(() => {
    setSelectedIds([]);
  }, [selectedMacro]);

  const onCreate = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });
    setCreating(true);
    try {
      await createServiceSubcategory(selectedMacro, newName);
      setNewName('');
      await loadCatalog();
      setFeedback({ type: 'success', message: 'Subcategoria criada com sucesso.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Não foi possível adicionar a subcategoria.' });
    } finally {
      setCreating(false);
    }
  };

  const onStartEdit = (item) => {
    setEditingId(item.id);
    setEditingValue(item.name);
    setFeedback({ type: '', message: '' });
  };

  const onSaveEdit = async () => {
    if (!editingId) {
      return;
    }
    setFeedback({ type: '', message: '' });
    setProcessingId(editingId);
    try {
      await updateServiceSubcategory(editingId, editingValue);
      setEditingId('');
      setEditingValue('');
      await loadCatalog();
      setFeedback({ type: 'success', message: 'Subcategoria atualizada com sucesso.' });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Não foi possível salvar a subcategoria.' });
    } finally {
      setProcessingId('');
    }
  };

  const openConfirmation = ({ action, mode, item = null, affectedCount = 0 }) => {
    setConfirmState({
      open: true,
      action,
      mode,
      item,
      affectedCount,
    });
  };

  const closeConfirmation = () => {
    setConfirmState({
      open: false,
      action: 'DEACTIVATE',
      mode: 'BATCH',
      item: null,
      affectedCount: 0,
    });
  };

  const onRequestItemToggle = (item) => {
    openConfirmation({ action: item.active ? 'DEACTIVATE' : 'REACTIVATE', mode: 'ITEM', item, affectedCount: 1 });
  };

  const onRequestBatchAction = (action) => {
    const affectedCount = action === 'DEACTIVATE' ? selectedActiveCount : selectedInactiveCount;
    openConfirmation({ action, mode: 'BATCH', affectedCount });
  };

  const onConfirmAction = async () => {
    setFeedback({ type: '', message: '' });

    if (confirmState.mode === 'ITEM' && confirmState.item) {
      const target = confirmState.item;
      const targetAction = confirmState.action;
      setProcessingId(target.id);
      try {
        if (targetAction === 'DEACTIVATE') {
          await deactivateServiceSubcategory(target.id);
        } else {
          await reactivateServiceSubcategory(target.id);
        }

        if (editingId === target.id) {
          setEditingId('');
          setEditingValue('');
        }

        await loadCatalog();
        setFeedback({
          type: 'success',
          message: targetAction === 'DEACTIVATE' ? '1 subcategoria desativada com sucesso.' : '1 subcategoria reativada com sucesso.',
        });
      } catch (err) {
        setFeedback({
          type: 'error',
          message: err.message
            || (targetAction === 'DEACTIVATE'
              ? 'Não foi possível desativar a subcategoria.'
              : 'Não foi possível reativar a subcategoria.'),
        });
      } finally {
        setProcessingId('');
        closeConfirmation();
      }
      return;
    }

    const targets = selectedRows.filter((item) => (confirmState.action === 'DEACTIVATE' ? item.active : !item.active));

    if (!targets.length) {
      setFeedback({
        type: 'info',
        message: confirmState.action === 'DEACTIVATE'
          ? 'Nenhuma alteração aplicada: todos os selecionados já estão desativados.'
          : 'Nenhuma alteração aplicada: todos os selecionados já estão ativos.',
      });
      closeConfirmation();
      return;
    }

    setBatchProcessing(true);
    try {
      await Promise.all(
        targets.map((item) => (confirmState.action === 'DEACTIVATE'
          ? deactivateServiceSubcategory(item.id)
          : reactivateServiceSubcategory(item.id))),
      );

      await loadCatalog();
      setSelectedIds([]);
      setFeedback({
        type: 'success',
        message: confirmState.action === 'DEACTIVATE'
          ? `Ação em lote concluída. Desativadas: ${targets.length}. Reativadas: 0.`
          : `Ação em lote concluída. Desativadas: 0. Reativadas: ${targets.length}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || 'Não foi possível concluir a ação em lote.',
      });
    } finally {
      setBatchProcessing(false);
      closeConfirmation();
    }
  };

  const toggleSelect = (itemId) => {
    setSelectedIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]));
  };

  const toggleSelectAllFiltered = () => {
    if (!filteredIds.length) {
      return;
    }

    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (isAllFilteredSelected) {
        filteredIds.forEach((id) => set.delete(id));
      } else {
        filteredIds.forEach((id) => set.add(id));
      }
      return Array.from(set);
    });
  };

  if (loading) {
    return <p className="text-aluminium">Carregando...</p>;
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl">Catálogo de solicitações</h2>
        <p className="mt-1 text-sm text-aluminium">
          Gerencie subcategorias por Serviço Macro, com controle de status para preservar histórico dos chamados.
        </p>
      </header>

      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-hydro-light-blue">Serviço Macro</p>
          <p className="text-xs text-aluminium">Clique em um card para gerenciar</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {serviceMacros.map((macro) => {
            const items = catalogByMacro[macro] || [];
            const activeCount = items.filter((item) => item.active).length;
            const isSelected = selectedMacro === macro;
            return (
              <button
                key={macro}
                type="button"
                onClick={() => setSelectedMacro(macro)}
                className={`rounded-lg border px-3 py-3 text-left transition ${getMacroCardClass(isSelected)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-bold">{macro}</p>
                  <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-hydro-light-blue'}`} />
                </div>
                <p className={`mt-1 text-xs ${isSelected ? 'text-white/85' : 'text-aluminium'}`}>
                  {items.length} subcategorias • {activeCount} ativas
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="card p-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-aluminium">Total</p>
          <p className="mt-1 text-3xl text-hydro-blue">{macroSummary.total}</p>
        </article>
        <article className="card p-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-aluminium">Ativas</p>
          <p className="mt-1 text-3xl text-green">{macroSummary.active}</p>
        </article>
        <article className="card p-4">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-aluminium">Desativadas</p>
          <p className="mt-1 text-3xl text-bauxite">{macroSummary.inactive}</p>
        </article>
      </div>

      {feedback.message ? (
        <p className={`rounded px-3 py-2 text-sm ${getFeedbackClass(feedback.type)}`}>
          {feedback.message}
        </p>
      ) : null}

      <div className="card p-4">
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr_auto]">
          <label className="text-sm text-mid-gray">
            Buscar no macro selecionado
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-aluminium" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input pl-8"
                placeholder="Digite parte do nome..."
              />
            </div>
          </label>

          <label className="text-sm text-mid-gray">
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input mt-1">
              <option value="ALL">Todas</option>
              <option value="ACTIVE">Ativas</option>
              <option value="INACTIVE">Desativadas</option>
            </select>
          </label>

          <label className="text-sm text-mid-gray">
            Ordenação
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value)} className="input mt-1">
              <option value="ACTIVE_FIRST">Ativas primeiro</option>
              <option value="NAME_ASC">Nome (A-Z)</option>
            </select>
          </label>

          <button
            type="button"
            className="btn btn-secondary btn-compact mt-6 h-fit"
            onClick={() => {
              setSearch('');
              setStatusFilter('ALL');
            }}
          >
            <FilterX className="h-4 w-4" />
            Limpar filtros
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 border-t border-light-gray pt-3">
          <button type="button" className="btn btn-secondary btn-compact" onClick={() => setStatusFilter('ACTIVE')}>
            <Eye className="h-4 w-4" />
            Só ativas
          </button>
          <button type="button" className="btn btn-secondary btn-compact" onClick={() => setStatusFilter('INACTIVE')}>
            <EyeOff className="h-4 w-4" />
            Só desativadas
          </button>
          <button type="button" className="btn btn-secondary btn-compact" onClick={() => setSelectedIds([])}>
            <X className="h-4 w-4" />
            Limpar seleção
          </button>
        </div>

        <form onSubmit={onCreate} className="mt-3 grid gap-3 border-t border-light-gray pt-4 md:grid-cols-[1fr_auto]">
          <label className="text-sm text-mid-gray">
            Nova subcategoria em {selectedMacro}
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              className="input mt-1"
              placeholder="Ex.: PI Vision"
            />
          </label>
          <button disabled={creating} type="submit" className="btn btn-primary btn-compact mt-6 h-fit disabled:opacity-50">
            <Plus className="h-4 w-4" />
            {creating ? 'Adicionando...' : 'Adicionar'}
          </button>
        </form>
      </div>

      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg text-hydro-blue">Subcategorias de {selectedMacro}</h3>
          <p className="text-sm text-aluminium">Mostrando {filteredItems.length} de {selectedItems.length}</p>
        </div>

        {!!selectedRows.length && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-hydro-light-blue/40 bg-hydro-light-blue/10 p-3 text-sm text-hydro-blue">
            <span className="font-bold">{selectedRows.length} selecionadas</span>
            <span>({selectedActiveCount} ativas, {selectedInactiveCount} desativadas)</span>
            <button
              type="button"
              className="btn btn-secondary btn-compact"
              disabled={batchProcessing}
              onClick={() => onRequestBatchAction('DEACTIVATE')}
            >
              <Power className="h-4 w-4" />
              Desativar
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-compact"
              disabled={batchProcessing}
              onClick={() => onRequestBatchAction('REACTIVATE')}
            >
              <RotateCcw className="h-4 w-4" />
              Reativar
            </button>
          </div>
        )}

        {!selectedItems.length ? (
          <div className="rounded border border-dashed border-light-gray bg-light-gray/60 p-6 text-center">
            <p className="text-sm text-mid-gray">Este Serviço Macro ainda não possui subcategorias.</p>
            <p className="mt-1 text-xs text-aluminium">Adicione a primeira subcategoria para liberar seleção em novos chamados.</p>
          </div>
        ) : !filteredItems.length ? (
          <div className="rounded border border-dashed border-light-gray bg-light-gray/60 p-6 text-center">
            <p className="text-sm text-mid-gray">Nenhum resultado para os filtros informados.</p>
            <button
              type="button"
              className="btn btn-secondary btn-compact mt-3"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
              }}
            >
              <FilterX className="h-4 w-4" />
              Limpar filtros
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            <li className="grid gap-2 rounded border border-light-gray bg-light-gray/40 p-3 md:grid-cols-[1fr_auto] md:items-center">
              <label className="flex items-center gap-2 text-sm font-bold text-mid-gray">
                <input className="checkbox-lg" type="checkbox" checked={isAllFilteredSelected} onChange={toggleSelectAllFiltered} />
                Selecionar todos da lista filtrada
              </label>
              <span className="text-xs text-aluminium">{filteredItems.length} itens na lista atual</span>
            </li>

            {filteredItems.map((item) => (
              <li key={item.id} className="grid gap-2 rounded border border-light-gray p-3 md:grid-cols-[1fr_auto] md:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="checkbox"
                    className="checkbox-lg"
                    checked={selectedIdsSet.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    aria-label={`Selecionar ${item.name}`}
                  />

                  {editingId === item.id ? (
                    <input
                      className="input max-w-md"
                      value={editingValue}
                      onChange={(event) => setEditingValue(event.target.value)}
                    />
                  ) : (
                    <span className="font-semibold text-mid-gray">{item.name}</span>
                  )}

                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${item.active ? 'bg-green text-white' : 'bg-bauxite/15 text-bauxite'}`}>
                    {item.active ? 'Ativa' : 'Desativada'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {editingId === item.id ? (
                    <>
                      <button
                        type="button"
                        title="Salvar"
                        className="btn btn-secondary btn-icon"
                        disabled={processingId === item.id}
                        onClick={onSaveEdit}
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Cancelar edição"
                        className="btn btn-secondary btn-icon"
                        onClick={() => {
                          setEditingId('');
                          setEditingValue('');
                          setFeedback({ type: '', message: '' });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        title="Editar"
                        className="btn btn-secondary btn-icon"
                        onClick={() => onStartEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title={item.active ? 'Desativar' : 'Reativar'}
                        className="btn btn-secondary btn-icon"
                        disabled={processingId === item.id}
                        onClick={() => onRequestItemToggle(item)}
                      >
                        {item.active ? <Power className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirmState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="card w-full max-w-lg p-4">
            <h4 className="text-xl text-hydro-blue">
              Confirmar {confirmState.action === 'DEACTIVATE' ? 'desativação' : 'reativação'}
            </h4>
            <p className="mt-2 text-sm text-mid-gray">
              Ação: {confirmState.action === 'DEACTIVATE' ? 'Desativar' : 'Reativar'}
            </p>
            <p className="text-sm text-mid-gray">Macro: {selectedMacro}</p>
            <p className="text-sm text-mid-gray">Itens afetados: {confirmState.affectedCount}</p>

            {confirmState.mode === 'BATCH' && confirmState.action === 'DEACTIVATE' ? (
              <p className="mt-2 rounded bg-bauxite/10 px-2 py-1 text-xs text-bauxite">
                Subcategorias desativadas não aparecem em novos chamados, mas continuam preservadas em chamados antigos.
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary btn-compact"
                disabled={batchProcessing || Boolean(processingId)}
                onClick={onConfirmAction}
              >
                <Check className="h-4 w-4" />
                Confirmar
              </button>
              <button type="button" className="btn btn-secondary btn-compact" onClick={closeConfirmation}>
                <X className="h-4 w-4" />
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
