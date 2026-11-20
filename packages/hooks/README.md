# @saplings/hooks

Use typed React hooks for controlled state, asynchronous work, browser events, and storage.

## Install

```bash
npm install @saplings/hooks react
```

## Quick start

```tsx
import { useCounter } from '@saplings/hooks';

export function Counter() {
  const { value, increment, reset } = useCounter(0);
  return (
    <>
      <output>{value}</output>
      <button onClick={() => increment()}>Increment</button>
      <button onClick={() => reset()}>Reset</button>
    </>
  );
}
```

## API and integration

- `useCounter(initial?)` gives you the current value and state actions. `useDebounce(value, delayMs?)` returns the debounced value.
- Use hooks inside React components or custom hooks. Check each browser and storage hook's SSR behavior before using it in a server-rendered application.
- Provide the React peer from your host application.

Read the [integration guide](https://github.com/snrakshith/saplings/blob/main/docs/technical-specifications/REACT_HOOKS.md) for configuration and operational details.
