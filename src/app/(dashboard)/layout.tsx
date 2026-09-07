import Link from "next/link";
import { logout } from "@/lib/auth/actions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/ipos" className="font-medium text-neutral-900">
              IPO Dashboard
            </Link>
            <Link href="/admin" className="text-neutral-500 hover:text-neutral-900">
              Admin
            </Link>
          </nav>
          <form action={logout}>
            <button type="submit" className="text-sm text-neutral-500 hover:text-neutral-900">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
