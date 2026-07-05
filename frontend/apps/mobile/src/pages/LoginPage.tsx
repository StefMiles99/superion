import { useTranslation } from "@superion/i18n";
import { Button, Screen } from "@superion/ui";
import { useState, type FormEvent } from "react";
import { useLogin } from "@/hooks/useAuth";

export default function LoginPage() {
  const { t } = useTranslation();
  const login = useLogin();
  const [email, setEmail] = useState("juan@planta.com");
  const [password, setPassword] = useState("test1234");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <Screen className="justify-center">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black tracking-tight text-sky-400">{t("common.appName")}</h1>
        <p className="mt-2 text-slate-400">{t("login.subtitle")}</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          {t("login.email")}
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-2xl bg-slate-900 px-4 py-4 text-lg text-white ring-1 ring-slate-800 outline-none focus:ring-sky-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          {t("login.password")}
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-2xl bg-slate-900 px-4 py-4 text-lg text-white ring-1 ring-slate-800 outline-none focus:ring-sky-500"
          />
        </label>

        {login.isError && <p className="text-sm text-rose-400">{t("login.error")}</p>}

        <Button type="submit" disabled={login.isPending}>
          {login.isPending ? t("common.loading") : t("login.submit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-600">{t("login.demoHint")}</p>
    </Screen>
  );
}
