import type { QueryClient } from "@tanstack/svelte-query";
import { render } from "@testing-library/svelte";
import RenderStore from "./render-store.svelte";

export function renderState<T>(
  queryClient: QueryClient,
  callback: () => T,
): { result: T; state: T; rerender: () => void; unmount: () => void } {
  const state = $state() as T;
  const props = { queryClient, callback, result: state };
  const { rerender, unmount } = render(RenderStore, { props });
  return { result: state, state, rerender: () => rerender(props), unmount };
}
