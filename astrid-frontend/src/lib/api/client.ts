import axios from "axios";
import { token } from "../auth/token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const t = token.get();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});