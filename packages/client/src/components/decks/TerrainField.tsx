import { type LocationDefinition, describeLocation } from '@ytcg-game/engine';
import { catalog } from '../../catalog.ts';

interface Props {
  terrain: string | null;
  terrains: LocationDefinition[];
  errors: string[];
  onChange: (terrain: string | null) => void;
}

const NONE = '';

function helpText(current: LocationDefinition | undefined, owned: number): string {
  if (current !== undefined) {
    return describeLocation(catalog, current).join(' ') || 'Aucun effet.';
  }
  return owned === 0
    ? 'Tu ne possèdes encore aucun terrain : un terrain aléatoire prendra sa place.'
    : 'Un terrain aléatoire prendra sa place.';
}

// Only owned terrains the game knows; a saved terrain lost since stays selectable until changed.
export function TerrainField({ terrain, terrains, errors, onChange }: Props): React.JSX.Element {
  const current = terrain === null ? undefined : catalog.locations.get(terrain);
  const lost = terrain !== null && !terrains.some((option) => option.id === terrain);
  return (
    <section className="deck">
      <h2 className="eyebrow">Terrain (optionnel)</h2>
      <select
        aria-label="Terrain"
        value={terrain ?? NONE}
        onChange={(event) => {
          onChange(event.target.value === NONE ? null : event.target.value);
        }}
      >
        <option value={NONE}>Aucun terrain (aléatoire)</option>
        {lost && (
          <option value={terrain}>{current?.name ?? 'Terrain inconnu du duel'} (plus dans ta collection)</option>
        )}
        {terrains.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name} ({catalog.extensions.get(option.extension ?? '') ?? 'neutre'})
          </option>
        ))}
      </select>
      <p className="location-help">{helpText(current, terrains.length)}</p>
      {errors.length > 0 && <p className="error is-small">{errors.join(' ')}</p>}
    </section>
  );
}
