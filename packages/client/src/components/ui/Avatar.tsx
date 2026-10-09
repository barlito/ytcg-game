interface Props {
  name: string;
  tone: 'you' | 'opponent';
}

// Square avatar with the bottom-right corner cut: the initial on the side colour.
export function Avatar({ name, tone }: Props): React.JSX.Element {
  return (
    <span className={`avatar tone-${tone}`} aria-hidden="true">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  );
}
