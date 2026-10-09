import { useMemo, useState } from 'react';
import { catalog } from '../catalog.ts';
import Board from '../components/Board.tsx';
import { DEFAULT_OPTIONS, type Ending, type FixtureOptions, buildFixture } from './fixture.ts';
import { SCENARIOS, SCENARIO_IDS, type ScenarioId } from './scenarios.ts';
import { registerSandboxTerrains } from './terrains.ts';
import './sandbox.css';

const ENDINGS: readonly { value: Ending; label: string }[] = [
  { value: 'none', label: 'En cours' },
  { value: 'win', label: 'Victoire' },
  { value: 'loss', label: 'Défaite' },
  { value: 'draw', label: 'Égalité' },
];

interface PanelProps {
  options: FixtureOptions;
  onChange: (patch: Partial<FixtureOptions>) => void;
  onReplay: () => void;
  onScenario: (id: ScenarioId) => void;
}

function Range({ label, value, min, max, onChange }: RangeProps): React.JSX.Element {
  return (
    <label>
      {label} ({value})
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
      />
    </label>
  );
}

interface RangeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function ScenarioButtons({
  active,
  onScenario,
}: {
  active: ScenarioId | null;
  onScenario: (id: ScenarioId) => void;
}): React.JSX.Element {
  return (
    <fieldset className="sandbox__scenarios">
      <legend>Animations</legend>
      {SCENARIO_IDS.map((id) => (
        <button
          key={id}
          type="button"
          className={active === id ? 'is-active' : undefined}
          onClick={() => {
            onScenario(id);
          }}
        >
          {SCENARIOS[id].label}
        </button>
      ))}
    </fieldset>
  );
}

function Controls({ options, onChange, onReplay, onScenario }: PanelProps): React.JSX.Element {
  return (
    <details className="sandbox" open>
      <summary>Bac à sable</summary>
      <Range
        label="Cartes en main"
        value={options.handCount}
        min={0}
        max={7}
        onChange={(handCount) => {
          onChange({ handCount });
        }}
      />
      <Range
        label="Tour"
        value={options.turn}
        min={1}
        max={6}
        onChange={(turn) => {
          onChange({ turn });
        }}
      />
      <label>
        Fin de partie
        <select
          value={options.ending}
          onChange={(event) => {
            onChange({ ending: ENDINGS.find((e) => e.value === event.target.value)?.value ?? 'none' });
          }}
        >
          {ENDINGS.map((ending) => (
            <option key={ending.value} value={ending.value}>
              {ending.label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={onReplay}>
        Rejouer une révélation
      </button>
      <ScenarioButtons active={options.scenario} onScenario={onScenario} />
    </details>
  );
}

// Time for the base board to show before a scenario message arrives (its destroyed cards must be known first).
const SETTLE_MS = 80;

registerSandboxTerrains(catalog);

// Dev only (?sandbox): the real board on a fabricated game, no server.
export default function Sandbox(): React.JSX.Element {
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [now, setNow] = useState(() => Date.now());
  const game = useMemo(() => buildFixture(catalog, options, now), [options, now]);
  return (
    <>
      <Board
        game={game}
        send={() => undefined}
        onLeave={() => {
          setOptions(DEFAULT_OPTIONS);
        }}
      />
      <Controls
        options={options}
        onChange={(patch) => {
          setOptions((current) => ({ ...current, ...patch, replay: false, scenario: null }));
        }}
        onScenario={(scenario) => {
          setOptions((current) => ({ ...current, scenario: null, replay: false }));
          window.setTimeout(() => {
            setNow(Date.now());
            setOptions((current) => ({ ...current, scenario, replay: false }));
          }, SETTLE_MS);
        }}
        onReplay={() => {
          setNow(Date.now());
          setOptions((current) => ({ ...current, replay: true }));
        }}
      />
    </>
  );
}
