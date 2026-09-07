import Link from "next/link";
import { LineChart, LogOut, Wrench } from "lucide-react";
import { logout } from "@/lib/auth/actions";
import ThemeToggle from "@/components/ThemeToggle";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-plane">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/ipos" className="flex items-center gap-1.5 font-medium text-ink">
              <LineChart size={17} className="text-accent" />
              IPO Dashboard
            </Link>
            <Link href="/admin" className="flex items-center gap-1.5 text-ink-secondary hover:text-ink">
              <Wrench size={14} />
              Admin
            </Link>
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action={logout}>
              <button
                type="submit"
                className="flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-ink-secondary hover:bg-ink/5 hover:text-ink"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
