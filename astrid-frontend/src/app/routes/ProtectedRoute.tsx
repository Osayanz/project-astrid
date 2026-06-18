import { Navigate } from "react-router-dom";
import { token } from "../../lib/auth/token";
import { getSession } from "../../lib/auth/session";

type Role = "student" | "lecturer" | "admin";

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: Role[];
}) {
  if (!token.get()) return <Navigate to="/login" replace />;

  if (roles && roles.length > 0) {
    const s = getSession();
    const role = s?.role as Role | undefined;
    if (!role || !roles.includes(role)) {
      if (role === "lecturer") return <Navigate to="/lecturer" replace />;
      if (role === "admin") return <Navigate to="/admin" replace />;
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}