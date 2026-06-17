import { jwtDecode } from "jwt-decode";
import { token } from "./token";

type JwtPayload = {
  sub?: string;
  email?: string;
  role?: "student" | "lecturer";
  exp?: number;
};

export function getSession() {
  const t = token.get();
  if (!t) return null;

  try {
    const payload = jwtDecode<JwtPayload>(t);
    return { token: t, ...payload };
  } catch {
    return null;
  }
}
export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}