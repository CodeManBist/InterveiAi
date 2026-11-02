import { useMemo } from "react";
import axios from "axios";
import { useAuth } from "@clerk/react";

export function useApi() {
  const { getToken } = useAuth();

  const api = useMemo(() => {
    const baseURL = (
      import.meta.env.VITE_API_URL ||
      "http://localhost:3000/api/v1"
    ).replace(/\/+$/, "");

    const instance = axios.create({
      baseURL,
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