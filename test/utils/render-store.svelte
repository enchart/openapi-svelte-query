<script lang="ts" module>
type T = unknown;

export interface RenderStoreProps {
  queryClient: QueryClient;
  callback: () => T;
  result: T;
}
</script>

<script lang="ts">
import type { QueryClient } from "@tanstack/svelte-query";
import { setContext } from "svelte";

let { queryClient, callback, result = $bindable() }: RenderStoreProps = $props();

setContext("$$_queryClient", queryClient);

const store = callback();
$effect(() => {
  result = store;
});
</script>

{store}
{(store as { data: unknown }).data}
