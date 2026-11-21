import { Field } from './Field.js';

export function KeyFields() {
  return (
    <div className="fields">
      <Field label="Name">
        <input name="name" required maxLength={100} placeholder="Customer Portal" />
      </Field>
      <Field label="Key" hint="Lowercase letters, numbers and hyphens.">
        <input
          name="id"
          required
          maxLength={40}
          placeholder="customer-portal"
          pattern="[a-z0-9]([a-z0-9\-]{0,38}[a-z0-9])?"
        />
      </Field>
    </div>
  );
}
