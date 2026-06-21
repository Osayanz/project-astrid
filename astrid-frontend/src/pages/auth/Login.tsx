import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { login } from "../../lib/api/auth";
import { token } from "../../lib/auth/token";
import { getSession } from "../../lib/auth/session";
import { useNavigate, Link } from "react-router-dom";
import AuthShell, { fieldLabel, fieldInput, fieldError } from "./AuthShell";

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
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await login({ email: values.email, password: values.password });
      token.set(res.access_token);
      const s = getSession();
      if (s?.role === "lecturer") nav("/lecturer");
      else if (s?.role === "admin") nav("/admin");
      else nav("/dashboard");
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        "Login failed. Check your email and password.";
      setError("root", { message: String(msg) });
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your ASTRID account."
      footer={
        <>
          Need a staff account?{" "}
          <Link className="text-[var(--ember-bright)] font-medium hover:underline" to="/register">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className={fieldLabel}>Email</label>
          <input className={fieldInput} placeholder="you@example.com" {...register("email")} />
          {errors.email && <p className={fieldError}>{errors.email.message}</p>}
        </div>

        <div>
          <label className={fieldLabel}>Password</label>
          <input type="password" className={fieldInput} placeholder="••••••••" {...register("password")} />
          {errors.password && <p className={fieldError}>{errors.password.message}</p>}
        </div>

        {errors.root?.message && (
          <div className="rounded-xl border border-[#ff8f6b]/30 bg-[#ff8f6b]/10 p-3 text-sm text-[#ffb59a]">
            {errors.root.message}
          </div>
        )}

        <button
          disabled={isSubmitting}
          type="submit"
          className="btn-ember w-full rounded-xl py-2.5 font-medium disabled:opacity-50"
        >
          {isSubmitting ? "Signing in…" : "Log in"}
        </button>
      </form>

      <p className="text-xs text-[var(--ink-500)] mt-5 text-center">
        Students sign in with the account created by their administrator.
      </p>
    </AuthShell>
  );
}
