import { useTranslation } from "@superion/i18n";
import { Button } from "@superion/ui";
import { useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { DesktopAccessDeniedError, useLogin } from "@/hooks/useAuth";
import { readRoleDenied } from "@/lib/loginState";

export default function LoginPage() {
  const { t } = useTranslation();
  const login = useLogin();
  const location = useLocation();
  const [email, setEmail] = useState("admin@planta.com");
  const [password, setPassword] = useState("test1234");

  const roleDenied =
    readRoleDenied(location.state) ||
    (login.isError && login.error instanceof DesktopAccessDeniedError);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 p-8 ring-1 ring-slate-800">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-black tracking-tight text-sky-400">
            {t("common.appName")}
          </h1>
          <p className="mt-1 text-slate-400">{t("manuals.navTitle")}</p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            {t("login.email")}
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl bg-slate-950 px-4 py-3 text-white ring-1 ring-slate-800 outline-none focus:ring-sky-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-400">
            {t("login.password")}
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl bg-slate-950 px-4 py-3 text-white ring-1 ring-slate-800 outline-none focus:ring-sky-500"
            />
          </label>

          {roleDenied && (
            <p className="text-sm text-rose-400">{t("login.roleDenied")}</p>
          )}

          {login.isError && !(login.error instanceof DesktopAccessDeniedError) && (
            <p className="text-sm text-rose-400">{t("login.error")}</p>
          )}

          <Button type="submit" disabled={login.isPending}>
            {login.isPending ? t("common.loading") : t("login.submit")}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">{t("access.adminHint")}</p>
      </div>
    </div>
  );
}
