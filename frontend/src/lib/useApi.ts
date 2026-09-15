import { useMemo } from "react";
import axios from "axios";
import { useAuth } from "@clerk/react";

/**
 * Returns a backend API client that authenticates requests with Clerk.
 *
 * Before each request, the client obtains the current session token and adds
 * it as a bearer token when one is available.
 */
export function useApi() {
  const { getToken } = useAuth();

  const api = useMemo(() => {
    const instance = axios.create({
      baseURL: "http://localhost:3000",
    });

    instance.interceptors.request.use(async (config) => {
      const token = await getToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    });

    return instance;
  }, [getToken]);

  return api;
}