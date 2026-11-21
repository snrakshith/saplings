import { useState, type FormEvent } from 'react';
import { message } from '../api.js';

export function useForm() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return {
    busy,
    error,
    submit(action: (fields: FormData) => Promise<unknown>) {
      return async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        setBusy(true);
        setError('');
        try {
          await action(fields);
        } catch (error) {
          setError(message(error));
        } finally {
          setBusy(false);
        }
      };
    },
  };
}
