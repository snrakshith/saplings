import { test } from 'vitest';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { act, create } from 'react-test-renderer';
import {
  useCounter,
  useToggle,
  useDebounce,
  useAsync,
  useMediaQuery,
  useLocalStorage,
  useOnlineStatus,
  usePagination,
  useDebouncedCallback,
} from '@saplings/hooks';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
test('SSR has no browser access and deterministic fallback', () => {
  function App() {
    const a = useMediaQuery('(min-width: 1px)');
    const b = useLocalStorage('key', 'fallback');
    const c = useOnlineStatus();
    return React.createElement('div', null, `${a}:${b.value}:${c}`);
  }
  assert.match(renderToString(React.createElement(App)), /false:fallback:true/);
});
test('counter, toggle, page clamping and debounce render updates', async () => {
  let state, root;
  function App({ value, total }) {
    state = {
      counter: useCounter(0),
      toggle: useToggle(),
      value: useDebounce(value, 10),
      page: usePagination(total, 2, 3),
    };
    return null;
  }
  await act(async () => {
    root = create(React.createElement(App, { value: 1, total: 10 }));
  });
  await act(async () => {
    state.counter.increment(2);
    state.toggle.toggle();
    root.update(React.createElement(App, { value: 2, total: 2 }));
  });
  assert.equal(state.counter.value, 2);
  assert.equal(state.toggle.value, true);
  assert.equal(state.page.page, 1);
  await act(async () => {
    await sleep(25);
  });
  assert.equal(state.value, 2);
  await act(async () => root.unmount());
});
test('async last invocation wins and unmount aborts pending request', async () => {
  let h, root;
  const requests = [];
  function App() {
    h = useAsync((signal, id) => new Promise((resolve) => requests.push({ signal, id, resolve })));
    return null;
  }
  await act(async () => {
    root = create(React.createElement(App));
  });
  let first, second;
  await act(async () => {
    first = h.run('a');
    second = h.run('b');
  });
  assert.equal(requests[0].signal.aborted, true);
  await act(async () => {
    requests[1].resolve('second');
    await second;
    requests[0].resolve('first');
    await first;
  });
  assert.equal(h.state.data, 'second');
  let third;
  await act(async () => {
    third = h.run('c');
  });
  await act(async () => root.unmount());
  assert.equal(requests[2].signal.aborted, true);
  requests[2].resolve('third');
  await third;
});
test('debounced callback cancels on unmount', async () => {
  let h, root;
  const calls = [];
  function App() {
    h = useDebouncedCallback((x) => calls.push(x), 10);
    return null;
  }
  await act(async () => {
    root = create(React.createElement(App));
  });
  await act(async () => {
    h.run(1);
    h.run(2);
  });
  await act(async () => {
    await sleep(25);
  });
  assert.deepEqual(calls, [2]);
  await act(async () => {
    h.run(3);
    root.unmount();
  });
  await sleep(25);
  assert.deepEqual(calls, [2]);
});
