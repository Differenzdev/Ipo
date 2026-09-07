import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/ipos", error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <form action={login} className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">IPO Dashboard</h1>
          <p className="text-sm text-neutral-500">Sign in to continue</p>
        </div>
        <input type="hidden" name="next" value={next} />
        <input
          type="password"
          name="password"
          placeholder="Password"
          autoFocus
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        {error && <p className="text-sm text-red-600">Incorrect password.</p>}
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
