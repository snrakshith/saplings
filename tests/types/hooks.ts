import {
  useAsync,
  useCounter,
  useDebounce,
  useList,
  useStorage,
  useWindowEvent,
  useElementSize,
  useEvent,
} from '@saplings/hooks';
function useFixture() {
  const n = useCounter();
  n.increment(2);
  const list = useList<string>();
  list.append('a');
  const value: number = useDebounce(3);
  const fn = useEvent((a: number) => a.toString());
  const result: string = fn(2);
  const task = useAsync(async (_signal: AbortSignal, id: string) => ({ id }));
  void task.run('x');
  const storage = useStorage('local', 'prefs', { dark: false });
  storage.set((old) => ({ dark: !old.dark }));
  useWindowEvent('keydown', (e) => {
    const key: string = e.key;
    void key;
  });
  const ref = useElementSize<HTMLDivElement>();
  // @ts-expect-error number list invalid
  list.append(3);
  // @ts-expect-error async argument must be string
  void task.run(123);
  // @ts-expect-error invalid counter argument
  n.increment('x');
  return { value, result, ref };
}
void useFixture;
