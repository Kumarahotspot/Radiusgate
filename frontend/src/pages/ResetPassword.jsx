import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api";
import { CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (pw !== pw2) { setError(t("password_mismatch")); return; }
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/reset-password", { token, new_password: pw });
      setDone(true);
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(d === "invalid_or_expired" ? t("reset_invalid") : d === "password_too_short" ? t("password_too_short") : (typeof d === "string" ? d : t("login_error")));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-800 via-[#0f3d3a] to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center overflow-hidden p-1">
            <img src="/logo.png" alt="EduGateID" className="w-full h-full object-contain" />
          </div>
          <p className="text-white font-extrabold text-lg">{t("app_name")}</p>
        </div>
        {done ? (
          <div data-testid="reset-success" className="text-center bg-white/5 border border-white/10 rounded-3xl p-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <p className="mt-4 text-emerald-400 font-semibold text-sm leading-relaxed">{t("reset_success")}</p>
            <Link to="/login" data-testid="reset-goto-login"
              className="mt-6 inline-block bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors">
              {t("back_to_login")}
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-white text-2xl font-bold text-center">{t("reset_page_title")}</h2>
            <form onSubmit={submit} className="mt-6 space-y-4" data-testid="reset-form">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t("new_password")}</label>
                <input data-testid="reset-new-password" type="password" required value={pw} onChange={(e) => setPw(e.target.value)}
                  className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t("confirm_password")}</label>
                <input data-testid="reset-confirm-password" type="password" required value={pw2} onChange={(e) => setPw2(e.target.value)}
                  className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition" />
              </div>
              {error && <p data-testid="reset-error" className="text-red-400 text-sm">{error}</p>}
              <button data-testid="reset-submit" disabled={busy}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl py-3 text-sm transition-colors disabled:opacity-50">
                {busy ? t("loading") : t("save")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
