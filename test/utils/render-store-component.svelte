<script lang="ts" module>
type T = unknown;

export interface RenderStoreComponentProps {
  queryClient: QueryClient;
  callback: () => Readable<T>;
  result: Writable<T>;
}
</script>

<script lang="ts" generics="T extends unknown">
import type { QueryClient } from "@tanstack/svelte-query";
import { setContext } from "svelte";
import type { Readable, Writable } from "svelte/store";

let { queryClient, callback, result }: RenderStoreComponentProps = $props();

setContext("$$_queryClient", queryClient);

const store = callback();
$effect(() => {
  $result = $store;
});
</script>

{$store}