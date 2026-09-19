import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth, homeFor } from "../context/AuthContext";
import { errMsg } from "../api";
import LangSwitch from "../components/LangSwitch";
import { ScanFace, MonitorSmartphone } from "lucide-react";

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await login(email, password);
      nav(homeFor(u.role));
    } catch (err) {
      setError(errMsg(err, t("login_error")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 bg-teal-800 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-teal-700/50" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-teal-900/60" />
        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
            <ScanFace className="w-6 h-6 text-white" />
          </div>
          <p className="text-white font-extrabold text-lg">{t("app_name")}</p>
        </div>
        <div className="relative">
          <h1 className="text-white text-4xl xl:text-5xl font-extrabold leading-tight">{t("app_tagline")}</h1>
          <p className="text-teal-100/80 mt-4 text-base max-w-md">Face recognition · Liveness · GPS Geofence · Offline sync · Billing otomatis</p>
        </div>
        <p className="relative text-teal-200/60 text-xs">SaaS Multi-Tenant · v1 Pilot</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-9 h-9 rounded-xl bg-teal-700 flex items-center justify-center">
                <ScanFace className="w-5 h-5 text-white" />
              </div>
              <p className="text-white font-bold">{t("app_name")}</p>
            </div>
            <div className="ml-auto"><LangSwitch dark /></div>
          </div>
          <h2 className="text-white text-2xl font-bold">{t("login_title")}</h2>
          <form onSubmit={submit} className="mt-6 space-y-4" data-testid="login-form">
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t("email")}</label>
              <input
                data-testid="login-email"
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t("password")}</label>
              <input
                data-testid="login-password"
                type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition"
              />
            </div>
            {error && <p data-testid="login-error" className="text-red-400 text-sm">{error}</p>}
            <button
              data-testid="login-submit"
              disabled={busy}
              className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl py-3 text-sm transition-colors disabled:opacity-50"
            >
              {busy ? t("loading") : t("login")}
            </button>
          </form>
          <Link
            to="/kiosk"
            data-testid="goto-kiosk-link"
            className="mt-6 flex items-center justify-center gap-2 text-teal-400 hover:text-teal-300 text-sm font-semibold transition-colors"
          >
            <MonitorSmartphone className="w-4 h-4" /> {t("open_kiosk")}
          </Link>
        </div>
      </div>
    </div>
  );
}
