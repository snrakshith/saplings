import { cloneElement, useId, type ReactElement } from 'react';

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactElement<{ id?: string; 'aria-describedby'?: string }>;
  hint?: string;
}) {
  const id = useId();
  const description = hint ? id + '-description' : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, { id, 'aria-describedby': description })}
      {hint && <small id={description}>{hint}</small>}
    </div>
  );
}
