import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";

let getToken;
let requestInterceptor;
let createCalls;
let memoDependencies;
let instance;

mock.module("react", {
  namedExports: {
    useMemo(factory, dependencies) {
      memoDependencies = dependencies;
      return factory();
    },
  },
});
mock.module("@clerk/react", {
  namedExports: {
    useAuth: () => ({ getToken }),
  },
});
mock.module("axios", {
  defaultExport: {
    create(options) {
      createCalls.push(options);
      instance = {
        interceptors: {
          request: {
            use(interceptor) {
              requestInterceptor = interceptor;
            },
          },
        },
      };
      return instance;
    },
  },
});

const { useApi } = await import("../src/lib/useApi.ts");

beforeEach(() => {
  getToken = async () => null;
  requestInterceptor = undefined;
  createCalls = [];
  memoDependencies = undefined;
  instance = undefined;
});

test("creates the API client with the backend base URL and memoizes by getToken", () => {
  const api = useApi();

  assert.equal(api, instance);
  assert.deepEqual(createCalls, [{ baseURL: "http://localhost:3000" }]);
  assert.deepEqual(memoDependencies, [getToken]);
  assert.equal(typeof requestInterceptor, "function");
});

test("adds the current Clerk bearer token while preserving existing headers", async () => {
  getToken = async () => "session-token";
  useApi();
  const config = { headers: { Accept: "application/json" } };

  const result = await requestInterceptor(config);

  assert.equal(result, config);
  assert.deepEqual(result.headers, {
    Accept: "application/json",
    Authorization: "Bearer session-token",
  });
});

test("does not add an Authorization header when Clerk has no active token", async () => {
  useApi();
  const config = { headers: { Accept: "application/json" } };

  const result = await requestInterceptor(config);

  assert.deepEqual(result.headers, { Accept: "application/json" });
  assert.equal("Authorization" in result.headers, false);
});

test("propagates token acquisition errors and does not send an unauthenticated request", async () => {
  const tokenError = new Error("token unavailable");
  getToken = async () => {
    throw tokenError;
  };
  useApi();

  await assert.rejects(
    requestInterceptor({ headers: {} }),
    (error) => error === tokenError,
  );
});
