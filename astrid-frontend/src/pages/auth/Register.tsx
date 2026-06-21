import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { register as registerApi } from "../../lib/api/auth";
import { useNavigate, Link } from "react-router-dom";
import AuthShell, { fieldLabel, fieldInput, fieldError } from "./AuthShell";

/* Public sign-up creates a STAFF (lecturer) account.
   Students are added by an administrator; admins are provisioned by the institution. */
const schema = z
  .object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(6, "Minimum 6 characters"),
    confirmPassword: z.string().min(6),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Form = z.infer<typeof schema>;

export default function Register() {
  const nav = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: Form) => {
    try {
      await registerApi({
        name: values.name,
        email: values.email,
        password: values.password,
        role: "lecturer",
        enrollment_year: null,
      });
      nav("/login");
    } catch (e: any) {
      let message = "Registration failed.";
      if (e.response?.data?.detail) {
        if (typeof e.response.data.detail === "string") message = e.response.data.detail;
        else if (Array.isArray(e.response.data.detail))
          message = e.response.data.detail.map((err: any) => err.msg).join(", ");
      }
      setError("root", { message });
    }
  };

  return (
    <AuthShell
      title="Create a staff account"
      subtitle="For lecturers. Set up your account to build quizzes and view analytics."
      footer={
        <>
          Already have an account?{" "}
          <Link className="text-[var(--ember-bright)] font-medium hover:underline" to="/login">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className={fieldLabel}>Full name</label>
          <input className={fieldInput} placeholder="Your full name" {...register("name")} />
          {errors.name && <p className={fieldError}>{errors.name.message}</p>}
        </div>

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

        <div>
          <label className={fieldLabel}>Confirm password</label>
          <input type="password" className={fieldInput} placeholder="••••••••" {...register("confirmPassword")} />
          {errors.confirmPassword && <p className={fieldError}>{errors.confirmPassword.message}</p>}
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
          {isSubmitting ? "Creating…" : "Create staff account"}
        </button>
      </form>

      <div className="mt-5 rounded-xl p-3 text-xs text-[var(--ink-300)]"
           style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        Students can’t self-register — an administrator creates student accounts.
        Administrator accounts are provisioned by the institution.
      </div>
    </AuthShell>
  );
}
