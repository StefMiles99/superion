import { useAuthStore } from "@superion/auth";
import { useTranslation } from "@superion/i18n";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useLogout } from "@/hooks/useAuth";
import { cn } from "@superion/ui";

export function DesktopShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      isActive ? "bg-slate-800 text-sky-400" : "text-slate-400 hover:text-slate-200",
    );

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-4">
          <div className="flex items-center gap-6">
            <span className="text-xl font-black tracking-tight text-sky-400">
              {t("common.appName")}
            </span>
            <nav className="flex gap-1">
              <NavLink to="/manuals" className={navLinkClass}>
                {t("manuals.navTitle")}
              </NavLink>
              <NavLink to="/sessions" className={navLinkClass}>
                {t("sessions.navTitle")}
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-slate-200">{user?.full_name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
            <button
              type="button"
              onClick={() => logout.mutate()}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
            >
              {t("workOrders.logout")}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-8 py-8">{children}</main>
    </div>
  );
}
