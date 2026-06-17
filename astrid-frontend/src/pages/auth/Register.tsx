import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { register as registerApi } from "../../lib/api/auth";
import { useNavigate, Link } from "react-router-dom";

const currentYear = new Date().getFullYear();
const yearOptions = [0, 1, 2, 3, 4, 5].map((n) => currentYear - n);

const schema = z
  .object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(6, "Minimum 6 characters"),
    confirmPassword: z.string().min(6),
    role: z.enum(["student", "lecturer"]),
    enrollment_year: z.string().optional(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((v) => v.role !== "student" || !!v.enrollment_year, {
    message: "Enrollment year is required for students",
    path: ["enrollment_year"],
  });

type Form = z.infer<typeof schema>;

export default function Register() {
  const nav = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { role: "student" },
  });

  const role = watch("role");

  const onSubmit = async (values: Form) => {
    try {
      await registerApi({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
        enrollment_year:
          values.role === "student" && values.enrollment_year
            ? Number(values.enrollment_year)
            : null,
      } as any);
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow p-6">
        <h1 className="text-2xl font-semibold">Create account</h1>
        <p className="text-sm text-gray-600 mt-1">Register to use ASTRID</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="Your full name"
              {...register("name")}
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Role</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              {...register("role")}
            >
              <option value="student">Student</option>
              <option value="lecturer">Lecturer</option>
            </select>
          </div>

          {role === "student" && (
            <div>
              <label className="text-sm font-medium">
                Enrollment year
                <span className="ml-1 text-xs text-gray-400">(year you joined)</span>
              </label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                {...register("enrollment_year")}
              >
                <option value="">Select year…</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y} {currentYear - y > 0 ? `(${currentYear - y}${["st","nd","rd"][currentYear-y-1] ?? "th"} year now)` : "(new)"}
                  </option>
                ))}
              </select>
              {errors.enrollment_year && (
                <p className="text-sm text-red-600 mt-1">{errors.enrollment_year.message}</p>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="••••••••"
              {...register("password")}
            />
            {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Confirm password</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="••••••••"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-600 mt-1">{errors.confirmPassword.message}</p>
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
            {isSubmitting ? "Creating..." : "Register"}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-4">
          Already have an account?{" "}
          <Link className="text-black font-medium underline" to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
