// # Route for /login (Server Component)
import LoginForm from "@/components/auth/login-form";

export const metadata = {
  title: "Login | Payroll Software",
  description: "Sign in to your unified payroll portal.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Sign in to access your business or employee profile.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
