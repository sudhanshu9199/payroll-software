// # Route for /signup (Server Component)

import SignupForm from "@/components/auth/signup-form";

export const metadata = {
  title: "Register Business | Payroll Software",
  description: "Create your business payroll profile.",
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900">
            Register your business
          </h2>
          <p className="mt-2 text-sm text-zinc-600">
            Set up your organization settings and administrator account.
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
