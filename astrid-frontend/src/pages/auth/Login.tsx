import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { login } from "../../lib/api/auth";
import { token } from "../../lib/auth/token";
import { getSession } from "../../lib/auth/session";
import { useNavigate, Link } from "react-router-dom";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Minimum 6 characters"),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const nav = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await login({
        email: values.email,
        password: values.password,
      });

      token.set(res.access_token);

      const s = getSession();

      if (s?.role === "lecturer") {
        nav("/lecturer");
      } else {
        nav("/dashboard");
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        "Login failed. Check email/password.";

      setError("root", { message: String(msg) });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow p-6">
        <h1 className="text-2xl font-semibold">ASTRID Login</h1>
        <p className="text-sm text-gray-600 mt-1">Sign in with your account</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>
            )}
          </div>

          {errors.root?.message && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {errors.root.message}
            </div>
          )}

          <button
            disabled={isSubmitting}
            className="w-full rounded-lg bg-black text-white py-2 font-medium hover:opacity-90 disabled:opacity-50"
            type="submit"
          >
            {isSubmitting ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4">
          Don’t have an account?{" "}
          <Link className="text-black font-medium underline" to="/register">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}