import { useNavigate } from "react-router-dom";
import { clearSession } from "../lib/auth/session";

type AppHeaderProps = {
  title?: string;
};

export default function AppHeader({ title = "ASTRID" }: AppHeaderProps) {
  const navigate = useNavigate();

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="mb-6 flex items-center justify-between rounded-xl border bg-white px-5 py-4 shadow-sm">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm text-gray-500">Predictive learning analytics system</p>
      </div>

      <button
        onClick={handleLogout}
        className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Logout
      </button>
    </div>
  );
}