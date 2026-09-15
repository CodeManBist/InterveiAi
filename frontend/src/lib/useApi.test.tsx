// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useApi } from "./useApi";

const mocks = vi.hoisted(() => ({
  axiosCreate: vi.fn(),
  getToken: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("axios", () => ({
  default: { create: mocks.axiosCreate },
}));

vi.mock("@clerk/react", () => ({
  useAuth: mocks.useAuth,
}));

function axiosInstance() {
  const use = vi.fn();
  return {
    instance: { interceptors: { request: { use } } },
    use,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useAuth.mockReturnValue({ getToken: mocks.getToken });
});

describe("useApi", () => {
  it("creates an API client with the backend base URL", () => {
    const { instance } = axiosInstance();
    mocks.axiosCreate.mockReturnValue(instance);

    const { result } = renderHook(() => useApi());

    expect(mocks.axiosCreate).toHaveBeenCalledWith({
      baseURL: "http://localhost:3000",
    });
    expect(result.current).toBe(instance);
  });

  it("adds the latest Clerk bearer token to each request", async () => {
    const { instance, use } = axiosInstance();
    mocks.axiosCreate.mockReturnValue(instance);
    mocks.getToken.mockResolvedValue("session-token");
    renderHook(() => useApi());
    const interceptor = use.mock.calls[0]?.[0];
    const config = { headers: { "X-Request-ID": "request-1" } };

    await expect(interceptor(config)).resolves.toEqual({
      headers: {
        "X-Request-ID": "request-1",
        Authorization: "Bearer session-token",
      },
    });
    expect(mocks.getToken).toHaveBeenCalledOnce();
  });

  it("leaves Authorization unset when Clerk has no token", async () => {
    const { instance, use } = axiosInstance();
    mocks.axiosCreate.mockReturnValue(instance);
    mocks.getToken.mockResolvedValue(null);
    renderHook(() => useApi());
    const interceptor = use.mock.calls[0]?.[0];
    const config = { headers: {} };

    await expect(interceptor(config)).resolves.toBe(config);
    expect(config.headers).not.toHaveProperty("Authorization");
  });

  it("memoizes the client until Clerk changes getToken", () => {
    const first = axiosInstance();
    const second = axiosInstance();
    const replacementGetToken = vi.fn();
    mocks.axiosCreate
      .mockReturnValueOnce(first.instance)
      .mockReturnValueOnce(second.instance);
    mocks.useAuth.mockReturnValue({ getToken: mocks.getToken });

    const { rerender, result } = renderHook(() => useApi());
    rerender();
    expect(result.current).toBe(first.instance);
    expect(mocks.axiosCreate).toHaveBeenCalledOnce();

    mocks.useAuth.mockReturnValue({ getToken: replacementGetToken });
    rerender();
    expect(result.current).toBe(second.instance);
    expect(mocks.axiosCreate).toHaveBeenCalledTimes(2);
  });
});
