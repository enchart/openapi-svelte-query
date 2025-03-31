import { createQueries, QueryClient } from "@tanstack/svelte-query";
import createFetchClient from "openapi-fetch";
import createClient from "../src";
import type { paths } from "./fixtures/api";
import { baseUrl, server, useMockRequestHandler } from "./fixtures/mock-server";
import { render } from "@testing-library/svelte";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const fetchInfinite = async () => {
  await new Promise(() => {});
  return Response.error();
};

beforeAll(() => {
  server.listen({
    onUnhandledRequest: "error",
  });
});

afterEach(() => {
  server.resetHandlers();
  queryClient.removeQueries();
});

afterAll(() => server.close());

describe("client", () => {
  it("generates all proper functions", () => {
    const fetchClient = createFetchClient<paths>({ baseUrl });
    const client = createClient<paths>(fetchClient);
    expect(client).toHaveProperty("queryOptions");
    expect(client).toHaveProperty("createQuery");
    expect(client).toHaveProperty("createMutation");
  });

  describe("queryOptions", () => {
    it("has correct parameter types", () => {
      const fetchClient = createFetchClient<paths>({ baseUrl });
      const client = createClient(fetchClient);

      client.queryOptions("get", "/string-array");
      // @ts-expect-error: Wrong method.
      client.queryOptions("put", "/string-array");
      // @ts-expect-error: Wrong path.
      client.queryOptions("get", "/string-arrayX");
      // @ts-expect-error: Missing 'post_id' param.
      client.queryOptions("get", "/blogposts/{post_id}", {});
    });

    it("returns query options that can resolve data correctly with fetchQuery", async () => {
      const response = { title: "title", body: "body" };
      const fetchClient = createFetchClient<paths>({ baseUrl });
      const client = createClient(fetchClient);

      useMockRequestHandler({
        baseUrl,
        method: "get",
        path: "/blogposts/1",
        status: 200,
        body: response,
      });

      const data = await queryClient.fetchQuery(
        client.queryOptions("get", "/blogposts/{post_id}", {
          params: {
            path: {
              post_id: "1",
            },
          },
        }),
      );

      expectTypeOf(data).toEqualTypeOf<{
        title: string;
        body: string;
        publish_date?: number;
      }>();

      expect(data).toEqual(response);
    });

    it("returns query options that can be passed to useQueries", async () => {
      const fetchClient = createFetchClient<paths>({ baseUrl, fetch: fetchInfinite });
      const client = createClient(fetchClient);

      const { result } = renderHook(
        () =>
          createQueries(
            {
              queries: [
                client.queryOptions("get", "/string-array"),
                client.queryOptions("get", "/string-array", {}),
                client.queryOptions("get", "/blogposts/{post_id}", {
                  params: {
                    path: {
                      post_id: "1",
                    },
                  },
                }),
                client.queryOptions("get", "/blogposts/{post_id}", {
                  params: {
                    path: {
                      post_id: "2",
                    },
                  },
                }),
              ],
            },
            queryClient,
          ),
        {
          wrapper,
        },
      );

      expectTypeOf(result.current[0].data).toEqualTypeOf<string[] | undefined>();
      expectTypeOf(result.current[0].error).toEqualTypeOf<{ code: number; message: string } | null>();

      expectTypeOf(result.current[1]).toEqualTypeOf<(typeof result.current)[0]>();

      expectTypeOf(result.current[2].data).toEqualTypeOf<
        | {
            title: string;
            body: string;
            publish_date?: number;
          }
        | undefined
      >();
      expectTypeOf(result.current[2].error).toEqualTypeOf<{ code: number; message: string } | null>();

      expectTypeOf(result.current[3]).toEqualTypeOf<(typeof result.current)[2]>();

      // Generated different queryKey for each query.
      expect(queryClient.isFetching()).toBe(4);
    });
  });
});
