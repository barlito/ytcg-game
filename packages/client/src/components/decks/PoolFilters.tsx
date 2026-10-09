import type { FilterOption, FilterOptions, PoolFilter } from '../../decks/pool.ts';

interface Props {
  options: FilterOptions;
  filter: PoolFilter;
  onChange: (filter: PoolFilter) => void;
}

interface ChipsProps<T extends string | number> {
  label: string;
  value: T | null;
  options: FilterOption<T>[];
  // « Tous »: a chip that clears the filter (universes only, the others toggle).
  all?: boolean;
  tone?: 'violet' | 'magenta';
  onChange: (value: T | null) => void;
}

function Chips<T extends string | number>({
  label,
  value,
  options,
  all = false,
  tone = 'violet',
  onChange,
}: ChipsProps<T>): React.JSX.Element | null {
  if (options.length === 0) {
    return null;
  }
  return (
    <fieldset className="filter-group">
      <legend>{label}</legend>
      <div className={`filter-chips is-${tone}`}>
        {all && (
          <button
            type="button"
            className={`chip${value === null ? ' is-active' : ''}`}
            aria-pressed={value === null}
            onClick={() => {
              onChange(null);
            }}
          >
            Tous
          </button>
        )}
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              className={`chip${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => {
                onChange(active ? null : option.value);
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// Cost 1…6 as mana-blue squares; a cost no owned card has stays disabled.
function CostBoxes({ options, filter, onChange }: Props): React.JSX.Element {
  const present = new Set(options.costs.map((option) => option.value));
  return (
    <fieldset className="filter-group is-cost">
      <legend>Coût</legend>
      <div className="cost-boxes">
        {[1, 2, 3, 4, 5, 6].map((cost) => (
          <button
            key={cost}
            type="button"
            className={`cost-box${filter.cost === cost ? ' is-active' : ''}`}
            aria-pressed={filter.cost === cost}
            aria-label={cost === 6 ? 'Coût 6 ou plus' : `Coût ${String(cost)}`}
            disabled={!present.has(cost)}
            onClick={() => {
              onChange({ ...filter, cost: filter.cost === cost ? null : cost });
            }}
          >
            {cost}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function PoolFilters({ options, filter, onChange }: Props): React.JSX.Element {
  return (
    <div className="pool-filters">
      <label className="filter-group filter-search">
        <span className="filter-label">Recherche</span>
        <input
          type="search"
          placeholder="Nom de carte…"
          value={filter.search}
          onChange={(event) => {
            onChange({ ...filter, search: event.target.value });
          }}
        />
      </label>
      <Chips
        label="Univers"
        all
        value={filter.universe}
        options={options.universes}
        onChange={(universe) => {
          onChange({ ...filter, universe });
        }}
      />
      <CostBoxes options={options} filter={filter} onChange={onChange} />
      <Chips
        label="Personnages"
        tone="magenta"
        value={filter.tag}
        options={options.tags}
        onChange={(tag) => {
          onChange({ ...filter, tag });
        }}
      />
    </div>
  );
}
