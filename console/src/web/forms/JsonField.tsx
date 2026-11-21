import { useState } from 'react';
import { message } from '../api.js';
import { Field } from './Field.js';
import { FormError } from './FormError.js';

export function JsonField({
  label,
  name,
  initial = '',
  yaml = false,
  bundle = false,
}: {
  label: string;
  name: string;
  initial?: string;
  yaml?: boolean;
  bundle?: boolean;
}) {
  const [text, setText] = useState(initial);
  const [error, setError] = useState('');
  return (
    <div className="json-field">
      <Field label={label}>
        <textarea
          name={name}
          value={text}
          onChange={(event) => setText(event.target.value)}
          spellCheck={false}
          wrap="off"
          required
          rows={12}
        />
      </Field>
      <Field label={'Load ' + label + ' from file'}>
        <input
          type="file"
          accept={yaml ? '.json,.yml,.yaml' : '.json,application/json'}
          onChange={async (event) => {
            const input = event.currentTarget;
            const file = input.files?.[0];
            input.value = '';
            if (!file) return;
            setError('');
            try {
              const maxMB = bundle ? 4 : 2;
              if (file.size > maxMB * 1_000_000)
                throw new Error('Use a file up to ' + maxMB + ' MB.');
              setText(await file.text());
            } catch (error) {
              setError(message(error));
            }
          }}
        />
      </Field>
      <FormError error={error} />
    </div>
  );
}
