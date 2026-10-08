import type { FilterOption, FilterOptions, PoolFilter } from '../../decks/pool.ts';

interface Props {
  options: FilterOptions;
  filter: PoolFilter;
  onChange: (filter: PoolFilter) => void;
}

interface SelectProps<T extends string | number> {
  label: string;
  all: string;
  value: T | null;
  options: FilterOption<T>[];
  onChange: (value: T | null) => void;
}

function FilterSelect<T extends string | number>({
  label,
  all,
  value,
  options,
  onChange,
}: SelectProps<T>): React.JSX.Element {
  return (
    <label className="field is-inline">
      {label}
      <select
        value={value === null ? '' : String(value)}
        onChange={(event) => {
          const found = options.find((option) => String(option.value) === event.target.value);
          onChange(found === undefined ? null : found.value);
        }}
      >
        <option value="">{all}</option>
        {options.map((option) => (
          <option key={option.value} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function PoolFilters({ options, filter, onChange }: Props): React.JSX.Element {
  return (
    <div className="pool-filters">
      <FilterSelect
        label="Univers"
        all="Tous"
        value={filter.universe}
        options={options.universes}
        onChange={(universe) => {
          onChange({ ...filter, universe });
        }}
      />
      <FilterSelect
        label="Coût"
        all="Tous"
        value={filter.cost}
        options={options.costs}
        onChange={(cost) => {
          onChange({ ...filter, cost });
        }}
      />
      <FilterSelect
        label="Tag"
        all="Tous"
        value={filter.tag}
        options={options.tags}
        onChange={(tag) => {
          onChange({ ...filter, tag });
        }}
      />
    </div>
  );
}
