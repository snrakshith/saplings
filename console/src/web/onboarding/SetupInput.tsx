import type { SetupField, SetupValues } from '../../onboarding.js';
import { Field } from '../forms/Field.js';

export function SetupInput({ field, saved }: { field: SetupField; saved: SetupValues }) {
  const { key, type, label, hint } = field;
  const initial = saved[key] ?? field.initial;
  if (type === 'boolean') {
    return (
      <label className="check">
        <input type="checkbox" name={key} defaultChecked={initial === true} />
        {label}
      </label>
    );
  }
  return (
    <Field label={label} hint={hint}>
      {type === 'choice' ? (
        <select name={key} defaultValue={String(initial)}>
          {field.options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : type === 'number' ? (
        <input
          name={key}
          type="number"
          required
          min={field.min}
          max={field.max}
          defaultValue={Number(initial)}
        />
      ) : (
        <input
          name={key}
          type={type === 'url' ? 'url' : 'text'}
          required
          maxLength={type === 'url' ? 500 : 100}
          defaultValue={String(initial)}
        />
      )}
    </Field>
  );
}
