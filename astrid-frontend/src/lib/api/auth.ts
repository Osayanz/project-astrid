import { api } from "./client";

export type LoginPayload = { email: string; password: string };
export type LoginResponse = { access_token: string; token_type: string };

export async function login(payload: LoginPayload) {
  const { data } = await api.post<LoginResponse>("/auth/login", payload);
  return data;
}

export type RegisterPayload = {
    name: string;
    email: string;
    password: string;
    role: "student" | "lecturer";
    enrollment_year?: number | null;
  };

export async function register(payload: RegisterPayload) {
  const { data } = await api.post("/auth/register", payload);
  return data;
}