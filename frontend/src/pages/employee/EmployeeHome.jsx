import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import { Clock, Send } from "lucide-react";

const rp = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function EmployeeHome() {
  const { t } = useTranslation();
  const [me, setMe] = useState(null);
  const [att, setAtt] = useState([]);
  const [reqs, setReqs] = useState([]);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ date: today, minutes: 60, reason: "" });
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get("/employee/me").then((r) => setMe(r.data)).catch(() => {});
    api.get("/employee/attendance").then((r) => setAtt(r.data)).catch(() => {});
    api.get("/employee/overtime").then((r) => setReqs(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/employee/overtime", { ...form, minutes: Number(form.minutes) });
      toast.success(t("save"));
      setForm({ date: today, minutes: 60, reason: "" });
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const badge = (s) => s === "approved" ? "bg-emerald-100 text-emerald-700" : s === "rejected" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700";

  return (
    <div data-testid="employee-home" className="space-y-6">
      {me && (
        <div className="bg-teal-800 text-white rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p data-testid="emp-me-name" className="font-bold text-lg">{me.name}</p>
            <p className="text-xs text-teal-200">{[me.department, me.position].filter(Boolean).join(" · ") || me.nip}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-teal-200">{t("overtime_rate")}</p>
            <p data-testid="emp-me-rate" className="font-bold">{rp(me.effective_overtime_rate)}</p>
          </div>
        </div>
      )}

      <form onSubmit={submit} data-testid="overtime-form" className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-teal-700" /> {t("request_overtime")}</p>
        <div className="grid sm:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("ot_date")}</label>
            <input data-testid="ot-date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("ot_minutes")}</label>
            <input data-testid="ot-minutes" type="number" min={15} max={720} step={15} required value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-500">{t("ot_reason")}</label>
            <input data-testid="ot-reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
        </div>
        <button data-testid="ot-submit" disabled={busy}
          className="mt-4 flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">
          <Send className="w-3.5 h-3.5" /> {t("request_overtime")}
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <p className="px-4 pt-4 font-bold text-slate-800">{t("my_overtime")}</p>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-3">{t("ot_date")}</th>
                <th className="px-4 py-3">{t("ot_minutes")}</th>
                <th className="px-4 py-3">{t("ot_reason")}</th>
                <th className="px-4 py-3">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {reqs.map((r) => (
                <tr key={r.id} data-testid={`my-ot-${r.id}`} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{r.date}</td>
                  <td className="px-4 py-3">{r.minutes}</td>
                  <td className="px-4 py-3 text-slate-600">{r.reason || "—"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${badge(r.status)}`}>{t(`ot_status_${r.status}`)}</span></td>
                </tr>
              ))}
              {reqs.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <p className="px-4 pt-4 font-bold text-slate-800">{t("my_attendance")}</p>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-3">{t("date")}</th>
                <th className="px-4 py-3">{t("type")}</th>
                <th className="px-4 py-3">{t("time")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("overtime_min")}</th>
              </tr>
            </thead>
            <tbody>
              {att.slice(0, 50).map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{a.date}</td>
                  <td className="px-4 py-3">{a.type === "in" ? t("check_in") : t("check_out")}</td>
                  <td className="px-4 py-3 font-mono text-xs">{a.time_local || (a.ts_device || "").slice(11, 16)}</td>
                  <td className="px-4 py-3">{a.status}</td>
                  <td className="px-4 py-3">{a.overtime_minutes || 0}</td>
                </tr>
              ))}
              {att.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
