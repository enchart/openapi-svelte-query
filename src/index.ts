import {
  createQuery,
  QueryClient,
  type Accessor,
  type CreateQueryOptions,
  type CreateQueryResult,
  type QueryFunctionContext,
  type SkipToken,
} from "@tanstack/svelte-query";
import type {
  ClientMethod,
  Client as FetchClient,
  FetchResponse,
  MaybeOptionalInit,
} from "openapi-fetch";
import type {
  HttpMethod,
  MediaType,
  PathsWithMethod,
  RequiredKeysOf,
} from "openapi-typescript-helpers";

// Helper type to dynamically infer the type from the `select` property
type InferSelectReturnType<TData, TSelect> = TSelect extends (
  data: TData
) => infer R
  ? R
  : TData;

type InitWithUnknowns<Init> = Init & { [key: string]: unknown };

export type QueryKey<
  Paths extends Record<string, Record<HttpMethod, {}>>,
  Method extends HttpMethod,
  Path extends PathsWithMethod<Paths, Method>,
  Init = MaybeOptionalInit<Paths[Path], Method>
> = Init extends undefined
  ? readonly [Method, Path]
  : readonly [Method, Path, Init];

export type QueryOptionsFunction<
  Paths extends Record<string, Record<HttpMethod, {}>>,
  Media extends MediaType
> = <
  Method extends HttpMethod,
  Path extends PathsWithMethod<Paths, Method>,
  Init extends MaybeOptionalInit<Paths[Path], Method>,
  Response extends Required<FetchResponse<Paths[Path][Method], Init, Media>>, // note: Required is used to avoid repeating NonNullable in UseQuery types
  Options extends Omit<
    CreateQueryOptions<
      Response["data"],
      Response["error"],
      InferSelectReturnType<Response["data"], Options["select"]>,
      QueryKey<Paths, Method, Path>
    >,
    "queryKey" | "queryFn"
  >
>(
  method: Method,
  path: Path,
  ...[init, options]: RequiredKeysOf<Init> extends never
    ? [InitWithUnknowns<Init>?, Options?]
    : [InitWithUnknowns<Init>, Options?]
) => NoInfer<
  Omit<
    CreateQueryOptions<
      Response["data"],
      Response["error"],
      InferSelectReturnType<Response["data"], Options["select"]>,
      QueryKey<Paths, Method, Path>
    >,
    "queryFn"
  > & {
    queryFn: Exclude<
      CreateQueryOptions<
        Response["data"],
        Response["error"],
        InferSelectReturnType<Response["data"], Options["select"]>,
        QueryKey<Paths, Method, Path>
      >["queryFn"],
      SkipToken | undefined
    >;
  }
>;

export type CreateQueryMethod<
  Paths extends Record<string, Record<HttpMethod, {}>>,
  Media extends MediaType
> = <
  Method extends HttpMethod,
  Path extends PathsWithMethod<Paths, Method>,
  Init extends MaybeOptionalInit<Paths[Path], Method>,
  Response extends Required<FetchResponse<Paths[Path][Method], Init, Media>>, // note: Required is used to avoid repeating NonNullable in UseQuery types
  Options extends Omit<
    CreateQueryOptions<
      Response["data"],
      Response["error"],
      InferSelectReturnType<Response["data"], Options["select"]>,
      QueryKey<Paths, Method, Path>
    >,
    "queryKey" | "queryFn"
  >
>(
  options: Accessor<
    RequiredKeysOf<Init> extends never
      ? [
          method: Method,
          url: Path,
          init?: InitWithUnknowns<Init>,
          options?: Options
        ]
      : [
          method: Method,
          url: Path,
          init: InitWithUnknowns<Init>,
          options?: Options
        ]
  >,
  queryClient?: Accessor<QueryClient>
) => CreateQueryResult<
  InferSelectReturnType<Response["data"], Options["select"]>,
  Response["error"]
>;

export interface OpenapiQueryClient<
  Paths extends {},
  Media extends MediaType = MediaType
> {
  queryOptions: QueryOptionsFunction<Paths, Media>;
  createQuery: CreateQueryMethod<Paths, Media>;
}

export default function createClient<
  Paths extends {},
  Media extends MediaType = MediaType
>(client: FetchClient<Paths, Media>): OpenapiQueryClient<Paths, Media> {
  const queryFn = async <
    Method extends HttpMethod,
    Path extends PathsWithMethod<Paths, Method>
  >({
    queryKey: [method, path, init],
    signal,
  }: QueryFunctionContext<QueryKey<Paths, Method, Path>>) => {
    const mth = method.toUpperCase() as Uppercase<typeof method>;
    const fn = client[mth] as ClientMethod<Paths, typeof method, Media>;
    const { data, error, response } = await fn(path, {
      signal,
      ...(init as any), // TODO: find a way to avoid as any
    });
    if (error) {
      throw error;
    }
    if (
      response.status === 204 ||
      response.headers.get("Content-Length") === "0"
    ) {
      return data ?? null;
    }

    return data;
  };

  const queryOptions: QueryOptionsFunction<Paths, Media> = (
    method,
    path,
    ...[init, options]
  ) => ({
    queryKey: (init === undefined
      ? ([method, path] as const)
      : ([method, path, init] as const)) as QueryKey<
      Paths,
      typeof method,
      typeof path
    >,
    queryFn,
    ...options,
  });

  return {
    queryOptions,
    createQuery: (options, queryClient) =>
      createQuery(() => {
        const [method, path, ...[init, opts]] = options();
        return queryOptions(
          method,
          path,
          init as InitWithUnknowns<typeof init>,
          opts
        );
      }, queryClient),
  };
}
