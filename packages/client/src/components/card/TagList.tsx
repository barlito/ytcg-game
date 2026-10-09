import { useState } from 'react';
import type { CardDefinition } from '@ytcg-game/engine';
import { catalog } from '../../catalog.ts';
import { type TagChip, foldTags, tagChips } from '../../lib/tags.ts';
import { Chip } from '../ui/Chip.tsx';

function TagPill({ chip }: { chip: TagChip }): React.JSX.Element {
  const read = chip.read ? ' is-read' : '';
  return (
    <li>
      <Chip className={`tag-chip tag-${chip.group}${read}`}>{chip.label}</Chip>
    </li>
  );
}

interface Props {
  definition: CardDefinition;
  // Fold after TAGS_SHOWN tags into a « +N » that opens on hover, focus or tap; off = always the full list (tooltips).
  fold?: boolean;
}

export function TagList({ definition, fold = false }: Props): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  const chips = tagChips(catalog, definition);
  if (chips.length === 0) {
    return null;
  }
  const { shown, hidden } = fold ? foldTags(chips) : { shown: chips, hidden: [] };
  const toggle = (value: boolean) => () => {
    setOpen(value);
  };
  return (
    <ul
      className="tag-list"
      aria-label="Tags"
      onMouseEnter={toggle(true)}
      onMouseLeave={toggle(false)}
      onBlur={toggle(false)}
    >
      {shown.map((chip) => (
        <TagPill key={chip.tag} chip={chip} />
      ))}
      {hidden.length > 0 && !open && (
        <li>
          <button
            type="button"
            className="chip tag-chip tag-more"
            aria-label={`${hidden.length} tags de plus`}
            onClick={toggle(true)}
            onFocus={toggle(true)}
          >
            +{hidden.length}
          </button>
        </li>
      )}
      {open && hidden.map((chip) => <TagPill key={chip.tag} chip={chip} />)}
    </ul>
  );
}
