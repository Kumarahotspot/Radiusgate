import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api, { errMsg } from "../api";
import { CheckCircle2 } from "lucide-react";

export default function RegisterTrial() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ school_name: "", admin_name: "", email: "", password: "", student_count: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/register-trial", { ...form, student_count: form.student_count ? Number(form.student_count) : null });
      setDone(true);
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  };

  const F = ({ k, label, type = "text", testid, req = true }) => (
    <div>
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</label>
      <input data-testid={testid} type={type} required={req} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-800 via-[#0f3d3a] to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-6 justify-center">
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center overflow-hidden p-1">
            <img src="/logo.png" alt="EduGateID" className="w-full h-full object-contain" />
          </div>
          <p className="text-white font-extrabold text-lg">{t("app_name")}</p>
        </div>
        {done ? (
          <div data-testid="register-success" className="text-center bg-white/5 border border-white/10 rounded-3xl p-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h2 className="mt-4 text-white text-2xl font-bold">{t("register_success_title")}</h2>
            <p className="mt-2 text-slate-300 text-sm leading-relaxed">{t("register_success_body")}</p>
            <Link to="/login" data-testid="register-goto-login"
              className="mt-6 inline-block bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors">
              {t("back_to_login")}
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-white text-2xl font-bold text-center">{t("register_page_title")}</h2>
            <p className="text-slate-400 text-sm text-center mt-2">{t("register_subtitle")}</p>
            <form onSubmit={submit} className="mt-6 space-y-4" data-testid="register-form">
              <F k="school_name" label={t("school_name")} testid="register-school-name" />
              <F k="admin_name" label={t("admin_name")} testid="register-admin-name" />
              <F k="email" label={t("email")} type="email" testid="register-email" />
              <F k="password" label={t("password")} type="password" testid="register-password" />
              <F k="student_count" label={t("student_count")} type="number" testid="register-student-count" req={false} />
              {error && <p data-testid="register-error" className="text-red-400 text-sm">{error}</p>}
              <button data-testid="register-submit" disabled={busy}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl py-3 text-sm transition-colors disabled:opacity-50">
                {busy ? t("loading") : t("register_trial")}
              </button>
            </form>
            <div className="mt-4 text-center">
              <Link to="/login" data-testid="register-back-login" className="text-xs font-semibold text-slate-400 hover:text-teal-300 transition-colors">{t("back_to_login")}</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
