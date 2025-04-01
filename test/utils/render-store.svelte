<script lang="ts" module>
type T = { data?: unknown };

export interface RenderStoreProps {
  queryClient: QueryClient;
  callback: () => Readable<T>;
  result: Writable<T>;
}
</script>

<script lang="ts" generics="T extends { data?: unknown }">
import type { QueryClient } from "@tanstack/svelte-query";
import { setContext } from "svelte";
import type { Readable, Writable } from "svelte/store";

let { queryClient, callback, result = $bindable() }: RenderStoreProps = $props();

setContext("$$_queryClient", queryClient);

const store = callback();
$effect(() => {
  $result = $store;
});
</script>

{$store}
{$store?.data}