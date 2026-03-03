import MultiSelectDropdown from './MultiSelectDropdown';
import { AREAS, SERVICE_MACROS, STATUS_OPTIONS } from '../data/catalog/requestCatalog';

function hasActiveFilters(filters) {
  return Object.values(filters).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return Boolean(value);
  });
}

export default function RequestFilters({
  filters,
  onChange,
  onClear,
  showResponsible = false,
  executors = [],
}) {
  const update = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <section className="card grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm text-mid-gray">
        Buscar (ID/Título)
        <input
          className="input mt-1"
          value={filters.search || ''}
          onChange={(event) => update('search', event.target.value)}
          placeholder="Ex.: CHD-0001"
        />
      </label>

      <label className="text-sm text-mid-gray">
        Área
        <MultiSelectDropdown
          label="Área"
          options={AREAS.map((area) => ({ value: area, label: area }))}
          selectedValues={filters.area || []}
          onChange={(values) => update('area', values)}
          allLabel="Todas"
        />
      </label>

      <label className="text-sm text-mid-gray">
        Serviço Macro
        <MultiSelectDropdown
          label="Serviço Macro"
          options={SERVICE_MACROS.map((item) => ({ value: item, label: item }))}
          selectedValues={filters.servicoMacro || []}
          onChange={(values) => update('servicoMacro', values)}
          allLabel="Todos"
        />
      </label>

      <label className="text-sm text-mid-gray">
        Status
        <MultiSelectDropdown
          label="Status"
          options={STATUS_OPTIONS.map((item) => ({ value: item, label: item }))}
          selectedValues={filters.status || []}
          onChange={(values) => update('status', values)}
          allLabel="Todos"
        />
      </label>

      <label className="text-sm text-mid-gray">
        GM?
        <MultiSelectDropdown
          label="GM"
          options={[{ value: 'Sim', label: 'Sim' }, { value: 'Não', label: 'Não' }]}
          selectedValues={filters.gm || []}
          onChange={(values) => update('gm', values)}
          allLabel="Todos"
        />
      </label>

      {showResponsible ? (
        <label className="text-sm text-mid-gray">
          Responsável
          <MultiSelectDropdown
            label="Responsável"
            options={[
              { value: 'SEM_RESPONSAVEL', label: 'Sem responsável' },
              ...executors.map((executor) => ({ value: executor.id, label: executor.name })),
            ]}
            selectedValues={filters.executorResponsavel || []}
            onChange={(values) => update('executorResponsavel', values)}
            allLabel="Todos"
          />
        </label>
      ) : null}

      <div className="md:col-span-2 lg:col-span-3">
        {hasActiveFilters(filters) ? (
          <button type="button" onClick={onClear} className="btn btn-secondary mt-2">
            Limpar todos os filtros
          </button>
        ) : null}
      </div>
    </section>
  );
}
