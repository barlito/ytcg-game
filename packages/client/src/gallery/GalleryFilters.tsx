import { catalog } from '../catalog.ts';
import { RARITY_LABEL, type RarityKey, rarityGlyph } from '../components/card/rarity.ts';
import type { CostSort, GalleryFilter } from './gallery.ts';

const RARITIES: readonly RarityKey[] = ['common', 'uncommon', 'rare', 'legendary', 'unique'];

const SORTS: readonly { value: CostSort; label: string }[] = [
  { value: 'catalog', label: 'Ordre des données' },
  { value: 'costAsc', label: 'Coût croissant' },
  { value: 'costDesc', label: 'Coût décroissant' },
];

interface Props {
  filter: GalleryFilter;
  onChange: (filter: GalleryFilter) => void;
}

interface ChipProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

function ChipButton({ active, label, onClick }: ChipProps): React.JSX.Element {
  return (
    <button type="button" className={`chip${active ? ' is-active' : ''}`} aria-pressed={active} onClick={onClick}>
      {label}
    </button>
  );
}

function ExtensionChips({ filter, onChange }: Props): React.JSX.Element {
  const pick = (extension: string | null) => () => {
    onChange({ ...filter, extension });
  };
  return (
    <fieldset className="gallery-filter">
      <legend>Extension</legend>
      <div className="gallery-filter__chips">
        <ChipButton active={filter.extension === null} label="Toutes" onClick={pick(null)} />
        {[...catalog.extensions].map(([slug, name]) => (
          <ChipButton key={slug} active={filter.extension === slug} label={name} onClick={pick(slug)} />
        ))}
      </div>
    </fieldset>
  );
}

function RarityChips({ filter, onChange }: Props): React.JSX.Element {
  return (
    <fieldset className="gallery-filter">
      <legend>Rareté</legend>
      <div className="gallery-filter__chips">
        {RARITIES.map((rarity) => (
          <ChipButton
            key={rarity}
            active={filter.rarity === rarity}
            label={`${rarityGlyph(rarity)} ${RARITY_LABEL[rarity]}`}
            onClick={() => {
              onChange({ ...filter, rarity: filter.rarity === rarity ? null : rarity });
            }}
          />
        ))}
      </div>
    </fieldset>
  );
}

function SearchRow({ filter, onChange }: Props): React.JSX.Element {
  return (
    <div className="gallery-filter__row">
      <label className="gallery-filter__search">
        <span>Recherche</span>
        <input
          type="search"
          value={filter.query}
          placeholder="Nom ou texte d’effet"
          onChange={(event) => {
            onChange({ ...filter, query: event.target.value });
          }}
        />
      </label>
      <label className="gallery-filter__sort">
        <span>Tri</span>
        <select
          value={filter.sort}
          onChange={(event) => {
            onChange({ ...filter, sort: SORTS.find((s) => s.value === event.target.value)?.value ?? 'catalog' });
          }}
        >
          {SORTS.map((sort) => (
            <option key={sort.value} value={sort.value}>
              {sort.label}
            </option>
          ))}
        </select>
      </label>
      <label className="gallery-filter__toggle">
        <input
          type="checkbox"
          checked={filter.noEffect}
          onChange={(event) => {
            onChange({ ...filter, noEffect: event.target.checked });
          }}
        />
        Sans effet
      </label>
    </div>
  );
}

export function GalleryFilters(props: Props): React.JSX.Element {
  return (
    <div className="gallery-filters">
      <SearchRow {...props} />
      <ExtensionChips {...props} />
      <RarityChips {...props} />
    </div>
  );
}
