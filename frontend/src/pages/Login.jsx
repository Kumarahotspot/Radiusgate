import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth, homeFor } from "../context/AuthContext";
import api, { errMsg } from "../api";
import LangSwitch from "../components/LangSwitch";
import { MonitorSmartphone } from "lucide-react";

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [sent, setSent] = useState(false);

  const sendReset = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email: forgotEmail });
    } catch { /* anti-enumeration: tetap tampilkan terkirim */ }
    setSent(true);
    setBusy(false);
  };

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
          <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center overflow-hidden p-1.5">
            <img src="/logo.png" alt="EduGateID" className="w-full h-full object-contain" />
          </div>
          <p className="text-white font-extrabold text-lg">{t("app_name")}</p>
        </div>
        <div className="relative">
          <h1 className="text-white text-4xl xl:text-5xl font-extrabold leading-tight">{t("app_tagline")}</h1>
          <p className="text-teal-100/80 mt-4 text-base max-w-md">Face recognition · Liveness · GPS Geofence · Offline sync · Billing otomatis</p>
        </div>
        <p className="relative text-teal-200/60 text-xs">{t("app_name")} oleh {t("company_name")} · SaaS Multi-Tenant · v1 Pilot</p>
      </div>
      <div className="flex-1 flex flex-col max-lg:bg-gradient-to-b max-lg:from-teal-800 max-lg:via-[#0f3d3a] max-lg:to-slate-950">
        <div className="lg:hidden relative overflow-hidden px-6 pt-6 pb-4">
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-teal-600/40" />
          <div className="absolute -bottom-24 -left-10 w-48 h-48 rounded-full bg-teal-900/40" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center overflow-hidden p-1">
                <img src="/logo.png" alt="EduGateID" className="w-full h-full object-contain" />
              </div>
              <p className="text-white font-extrabold text-lg">{t("app_name")}</p>
            </div>
            <LangSwitch dark />
          </div>
          <h1 className="relative text-white text-[26px] font-extrabold leading-tight mt-6">{t("app_tagline")}</h1>
          <div className="relative mt-4 flex flex-wrap gap-1.5">
            {["Face Recognition", "Liveness", "GPS Geofence", "Offline Sync"].map((c) => (
              <span key={c} className="text-[10px] font-bold text-teal-100 bg-white/10 border border-white/15 rounded-full px-2.5 py-1">{c}</span>
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 w-full">
        <div className="w-full max-w-sm">
          <div className="hidden lg:flex items-center justify-end mb-8">
            <LangSwitch dark />
          </div>
          {forgot ? (
            <div>
              <h2 className="text-white text-2xl font-bold">{t("forgot_password")}</h2>
              {sent ? (
                <p data-testid="forgot-sent" className="mt-4 text-emerald-400 text-sm leading-relaxed">{t("reset_sent")}</p>
              ) : (
                <form onSubmit={sendReset} className="mt-6 space-y-4" data-testid="forgot-form">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t("email")}</label>
                    <input data-testid="forgot-email" type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                      className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition" />
                  </div>
                  <button data-testid="forgot-submit" disabled={busy}
                    className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl py-3 text-sm transition-colors disabled:opacity-50">
                    {busy ? t("loading") : t("reset_send")}
                  </button>
                </form>
              )}
              <button data-testid="forgot-back" onClick={() => { setForgot(false); setSent(false); }}
                className="mt-4 text-xs font-semibold text-slate-400 hover:text-teal-300 transition-colors">{t("back_to_login")}</button>
            </div>
          ) : (
          <>
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
          <div className="mt-4 flex items-center justify-between gap-2 text-xs font-semibold">
            <button type="button" data-testid="forgot-link" onClick={() => setForgot(true)} className="text-slate-400 hover:text-teal-300 transition-colors">{t("forgot_password")}</button>
            <Link to="/daftar" data-testid="register-link" className="text-teal-400 hover:text-teal-300 transition-colors">{t("no_account")} <span className="underline">{t("register_trial")}</span></Link>
          </div>
          </>
          )}
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
    </div>
  );
}
