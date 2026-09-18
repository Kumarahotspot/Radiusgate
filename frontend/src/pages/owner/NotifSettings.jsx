import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import { Mail, MessageCircle, Send } from "lucide-react";

export default function NotifSettings() {
  const { t } = useTranslation();
  const [cfg, setCfg] = useState(null);
  const [secrets, setSecrets] = useState({ smtp_password: "", wablas_token: "", wablas_secret_key: "" });
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState({ email: "", whatsapp: "" });
  const [testing, setTesting] = useState(null);

  const load = () => api.get("/owner/notif-settings").then((r) => setCfg(r.data));
  useEffect(() => { load(); }, []);

  if (!cfg) return <p className="text-slate-400 text-sm">{t("loading")}</p>;
  const set = (k, v) => setCfg({ ...cfg, [k]: v });

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/owner/notif-settings", {
        email_mode: cfg.email_mode,
        smtp_host: cfg.smtp_host, smtp_port: Number(cfg.smtp_port || 587), smtp_user: cfg.smtp_user,
        smtp_password: secrets.smtp_password, smtp_from_email: cfg.smtp_from_email,
        smtp_from_name: cfg.smtp_from_name, smtp_tls: !!cfg.smtp_tls,
        wa_provider: cfg.wa_provider, wablas_base_url: cfg.wablas_base_url,
        wablas_token: secrets.wablas_token, wablas_secret_key: secrets.wablas_secret_key,
      });
      setSecrets({ smtp_password: "", wablas_token: "", wablas_secret_key: "" });
      toast.success(t("save"));
      load();
    } catch (e) { toast.error(errMsg(e)); } finally { setSaving(false); }
  };

  const test = async (channel) => {
    if (!testTo[channel]) return;
    setTesting(channel);
    try {
      const { data } = await api.post("/owner/notif-settings/test", { channel, to: testTo[channel] });
      if (data.wa_link) {
        toast.success(t("wa_link_provider"));
        window.open(data.wa_link, "_blank");
      } else {
        toast.success(`${t("test_send")} OK (${data.via || data.mode})`);
      }
    } catch (e) { toast.error(errMsg(e)); } finally { setTesting(null); }
  };

  return (
    <div data-testid="notif-settings" className="space-y-6 max-w-3xl">
      <h2 className="text-lg font-bold text-slate-800">{t("notif_settings")}</h2>

      {/* EMAIL */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <p className="font-bold text-slate-800 flex items-center gap-2"><Mail className="w-4 h-4 text-teal-700" /> {t("email_channel")}</p>
        <div>
          <label className="text-xs font-semibold text-slate-500">{t("email_mode")}</label>
          <select data-testid="email-mode" value={cfg.email_mode} onChange={(e) => set("email_mode", e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
            <option value="resend">{t("mode_resend")}</option>
            <option value="smtp">{t("mode_smtp")}</option>
          </select>
        </div>
        {cfg.email_mode === "smtp" && (
          <div className="grid sm:grid-cols-2 gap-4 border-t pt-4">
            <In label={t("smtp_host")} testid="smtp-host" v={cfg.smtp_host} set={(v) => set("smtp_host", v)} ph="smtp.gmail.com" />
            <In label={t("smtp_port")} testid="smtp-port" type="number" v={cfg.smtp_port} set={(v) => set("smtp_port", v)} ph="587" />
            <In label={t("smtp_user")} testid="smtp-user" v={cfg.smtp_user} set={(v) => set("smtp_user", v)} />
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("smtp_pass")} {cfg.smtp_password_set && <span className="text-emerald-600">{t("secret_saved")}</span>}</label>
              <input data-testid="smtp-pass" type="password" value={secrets.smtp_password} placeholder={t("secret_keep")}
                onChange={(e) => setSecrets({ ...secrets, smtp_password: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
            </div>
            <In label={t("smtp_from_email")} testid="smtp-from-email" v={cfg.smtp_from_email} set={(v) => set("smtp_from_email", v)} />
            <In label={t("smtp_from_name")} testid="smtp-from-name" v={cfg.smtp_from_name} set={(v) => set("smtp_from_name", v)} />
            <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
              <input data-testid="smtp-tls" type="checkbox" checked={!!cfg.smtp_tls} onChange={(e) => set("smtp_tls", e.target.checked)} className="accent-teal-700 w-4 h-4" />
              {t("smtp_tls")}
            </label>
          </div>
        )}
        <div className="flex gap-2 items-end border-t pt-4">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-500">{t("test_to")} (email)</label>
            <input data-testid="test-email-to" value={testTo.email} onChange={(e) => setTestTo({ ...testTo, email: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" placeholder="email@sekolah.id" />
          </div>
          <button data-testid="test-email-btn" onClick={() => test("email")} disabled={testing === "email"}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-50">
            <Send className="w-3.5 h-3.5" /> {t("test_send")}
          </button>
        </div>
      </div>

      {/* WHATSAPP */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <p className="font-bold text-slate-800 flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-600" /> {t("wa_channel")}</p>
        <div>
          <label className="text-xs font-semibold text-slate-500">{t("wa_provider")}</label>
          <select data-testid="wa-provider" value={cfg.wa_provider} onChange={(e) => set("wa_provider", e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
            <option value="link">{t("wa_link_provider")}</option>
            <option value="wablas">{t("wa_wablas")}</option>
          </select>
        </div>
        {cfg.wa_provider === "wablas" && (
          <div className="grid sm:grid-cols-2 gap-4 border-t pt-4">
            <In label={t("wablas_base")} testid="wablas-base" v={cfg.wablas_base_url} set={(v) => set("wablas_base_url", v)} ph="https://www.wablas.com" />
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("wablas_token")} {cfg.wablas_token_set && <span className="text-emerald-600">{t("secret_saved")}</span>}</label>
              <input data-testid="wablas-token" type="password" value={secrets.wablas_token} placeholder={t("secret_keep")}
                onChange={(e) => setSecrets({ ...secrets, wablas_token: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("wablas_secret")} {cfg.wablas_secret_key_set && <span className="text-emerald-600">{t("secret_saved")}</span>}</label>
              <input data-testid="wablas-secret" type="password" value={secrets.wablas_secret_key} placeholder={t("secret_keep")}
                onChange={(e) => setSecrets({ ...secrets, wablas_secret_key: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
            </div>
          </div>
        )}
        <div className="flex gap-2 items-end border-t pt-4">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-500">{t("test_to")} (WA, 62...)</label>
            <input data-testid="test-wa-to" value={testTo.whatsapp} onChange={(e) => setTestTo({ ...testTo, whatsapp: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" placeholder="6281234567890" />
          </div>
          <button data-testid="test-wa-btn" onClick={() => test("whatsapp")} disabled={testing === "whatsapp"}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50">
            <Send className="w-3.5 h-3.5" /> {t("test_send")}
          </button>
        </div>
      </div>

      <button data-testid="notif-save-btn" onClick={save} disabled={saving}
        className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">
        {saving ? t("loading") : t("save")}
      </button>
    </div>
  );
}

function In({ label, v, set, type = "text", ph = "", testid }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      <input data-testid={testid} type={type} value={v ?? ""} placeholder={ph} onChange={(e) => set(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
    </div>
  );
}
