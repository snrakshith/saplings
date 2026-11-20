# @saplings/hooks

Typed reusable React hooks (React 18.2+ or 19). Independently installable; not a dependency of `@sapling/sdk`.

```bash
pnpm add @saplings/hooks react
```

```tsx
import {useCounter,useDebounce,useAsync,useMediaQuery} from '@saplings/hooks';
function Counter(){const {value,increment}=useCounter(0);return <button onClick={()=>increment()}>{value}</button>}
```

See `docs/technical-specifications/REACT_HOOKS.md` in the monorepo for all 28 hooks, examples, SSR/cancellation/storage contracts and validation limitations. Source release: build and test with `pnpm run build:hooks`, `pnpm run typecheck:hooks`, `pnpm run test:hooks` from workspace root. Requires installed React and types; not verified against a live React runtime in the packaging environment.
