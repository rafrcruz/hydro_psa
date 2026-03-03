import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useMemo } from 'react';

export default function MultiSelectDropdown({
  label,
  options,
  selectedValues = [],
  onChange,
  allLabel = 'Todos',
}) {
  const selectedLabel = useMemo(() => {
    if (!selectedValues.length) {
      return allLabel;
    }
    if (selectedValues.length === 1) {
      return options.find((option) => option.value === selectedValues[0])?.label || selectedValues[0];
    }
    return `${selectedValues.length} selecionados`;
  }, [selectedValues, options, allLabel]);

  const toggleValue = (value) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((item) => item !== value));
      return;
    }
    onChange([...selectedValues, value]);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="input mt-1 flex items-center justify-between text-left"
          aria-label={label}
        >
          <span className="truncate">{selectedLabel}</span>
          <span className="ml-2 text-xs text-aluminium">▾</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={6}
          align="start"
          className="z-[120] max-h-72 min-w-[260px] overflow-auto rounded-lg border border-light-gray bg-white p-2 shadow-xl"
        >
          <p className="px-1 pb-1 text-xs font-semibold uppercase text-aluminium">{label}</p>
          {options.map((option) => (
            <DropdownMenu.CheckboxItem
              key={option.value}
              checked={selectedValues.includes(option.value)}
              onCheckedChange={() => toggleValue(option.value)}
              onSelect={(event) => event.preventDefault()}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-mid-gray outline-none hover:bg-light-gray data-[highlighted]:bg-light-gray"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-aluminium bg-white text-xs">
                {selectedValues.includes(option.value) ? '✓' : ''}
              </span>
              <span>{option.label}</span>
            </DropdownMenu.CheckboxItem>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
