import { LineChart } from "lucide-react";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/ipos", error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-plane">
      <form action={login} className="w-full max-w-sm space-y-4 rounded-xl border border-hairline bg-surface p-8 shadow-sm">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-ink">
            <LineChart size={18} className="text-accent" />
            IPO Dashboard
          </h1>
          <p className="text-sm text-ink-secondary">Sign in to continue</p>
        </div>
        <input type="hidden" name="next" value={next} />
        <input
          type="password"
          name="password"
          placeholder="Password"
          autoFocus
          required
          className="w-full rounded-md border border-hairline bg-plane px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
        />
        {error && <p className="text-sm text-critical">Incorrect password.</p>}
        <button
          type="submit"
          className="w-full rounded-md bg-ink px-3 py-2 text-sm font-medium text-plane hover:opacity-90"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
