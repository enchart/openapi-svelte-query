import type { QueryClient } from "@tanstack/svelte-query";
import { render } from "@testing-library/svelte";
import { get, writable, type Readable, type Writable } from "svelte/store";
import RenderStoreComponent from "./render-store-component.svelte";

export function renderStore<T>(
  queryClient: QueryClient,
  callback: () => Readable<T>,
): { result: T; store: Writable<T>; rerender: () => void; unmount: () => void } {
  const store = writable<T>();
  const props = { queryClient, callback, result: store };
  const { rerender, unmount } = render(RenderStoreComponent, { props });
  return { result: get(store), store, rerender: () => rerender(props), unmount };
}
