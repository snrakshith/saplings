# @saplings/hooks — React-specific reusable hooks

28 named hooks, divided into four source modules (`state.ts`, `async.ts`, `browser.ts`, `storage.ts`). React 18.2 or 19 is a peer. Native React state/effects/external-store APIs are used; no backend imports, no React Query dependency, no fake React runtime. `@saplings/utils/hooks` remains framework-agnostic primitives. Import from `@saplings/hooks` only in React client components.

| Hook | Purpose |
|---|---|
| useEvent | Stable callback calling latest committed effect-updated callback |
| useToggle | Boolean state, on/off/toggle |
| useCounter | Numeric state, increment/decrement/reset |
| usePrevious | Previous committed value |
| useDebounce | Debounced value with cleanup |
| useDebouncedCallback | Debounced execution with cancel/flush |
| useInterval | Repeating callback, null pauses |
| useTimeout | Delayed callback, null disables |
| useDisclosure | Dialog open/close/toggle |
| useList | Immutable array operations |
| usePagination | Validated page/offset, clamp on total change |
| useMounted | Client mount state |
| useSelection | Immutable set selection |
| useAsync | Explicit typed execution, last invocation wins, abort on cleanup |
| useFetch | Fetch with typed response parser and HTTP status checks |
| useMediaQuery | Media query subscription, SSR fallback |
| useOnlineStatus | Browser online/offline state |
| useDocumentVisible | Document visibility subscription |
| useWindowEvent | Typed WindowEventMap subscription |
| useClickOutside | Pointer listener with ref containment |
| useKeyPress | Keyboard handler |
| useIntersection | IntersectionObserver with callback ref |
| useElementSize | ResizeObserver with callback ref |
| useClipboard | Clipboard copy, observable copied status |
| useWindowSize | Window dimensions |
| useStorage | Typed local/session persistence, same-document + storage events |
| useLocalStorage | Local storage convenience hook |
| useSessionStorage | Session storage convenience hook |

```tsx
import {useDebounce,useAsync,useCounter,useLocalStorage,useMediaQuery} from '@saplings/hooks';
import {useState} from 'react';
function Search() {
 const [query,setQuery]=useState('');
 const term=useDebounce(query,300);
 const request=useAsync(async (signal:AbortSignal,q:string)=>{
   const response=await fetch('/api/search?q='+encodeURIComponent(q),{signal});
   if(!response.ok)throw new Error('Request failed');
   return response.text();
 });
 const counter=useCounter();
 const compact=useMediaQuery('(max-width: 600px)');
 const prefs=useLocalStorage('ui-density','comfortable');
 return <div>
  <input value={query} onChange={e=>setQuery(e.target.value)}/>
  <button onClick={()=>{void request.run(term).catch(()=>{});}}>Search</button>
  <button onClick={()=>counter.increment()}>Count {counter.value}</button>
  <button onClick={()=>prefs.set('compact')}>{compact?'Mobile':prefs.value}</button>
  <p>{request.state.status}</p>
 </div>;
}
```

Contracts: async tasks are not retried automatically; cancellation aborts cooperative operations and suppresses stale state updates, not external effects. `run` returns the underlying promise; callers must handle rejection and may receive results from cancelled tasks even though state is unchanged. Browser hooks avoid browser globals during SSR; initial media/storage/size state may update after hydration. Storage is not secure secret storage; use a validating codec for untrusted JSON, catch quota/access errors from writes, and use appropriate per-user namespace. Cross-tab storage changes are browser events, not atomic synchronization. Clipboard requires user gesture/secure context. This package provides utilities, not a full query cache or state management library.

Validation: `pnpm run build:hooks`, `pnpm run typecheck:hooks`, `pnpm run test:hooks`. The included runtime suite exercises SSR, counter/toggle/pagination/debounce, async race and unmount abort, timer cleanup. Browser event and storage integration tests with real browser fixtures remain to be added/executed. Current environment has no React dependency: syntax-only validation is not a React build or functional test.
