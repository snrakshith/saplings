import { useState } from 'react';
import { Button } from '@saplings/murphi-ui';

export type Session = {
  profile: 'local' | 'durable';
  signedIn: boolean;
  consent: boolean;
  canOperate: boolean;
};

export function SessionFields({
  durable,
  disabled,
  signIn,
}: {
  durable: boolean;
  disabled: boolean;
  signIn(input: { login: string; password: string } | { token: string }): Promise<void>;
}) {
  const [login, setLogin] = useState('');
  const [secret, setSecret] = useState('');
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const input = durable ? { login, password: secret } : { token: secret };
        setSecret('');
        void signIn(input);
      }}
    >
      {durable && (
        <label className="catalog-search">
          Username
          <input
            autoComplete="username"
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            required
          />
        </label>
      )}
      <label className="catalog-search">
        {durable ? 'Password' : 'Starter member token'}
        <input
          type="password"
          required
          autoComplete={durable ? 'current-password' : 'off'}
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
        />
      </label>
      <Button type="submit" disabled={disabled}>
        Sign in
      </Button>
    </form>
  );
}
