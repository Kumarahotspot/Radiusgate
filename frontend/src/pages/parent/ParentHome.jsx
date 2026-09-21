import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import { CalendarClock, KeyRound, Send } from "lucide-react";

export default function ParentHome() {
  const { t } = useTranslation();
  const [me, setMe] = useState(null);
  const [att, setAtt] = useState([]);
  const today = new Date().toISOString().slice(0, 10);
  const [leave, setLeave] = useState({ status: "sakit", date: today, note: "" });
  const [pw, setPw] = useState({ current_password: "", new_password: "" });
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get("/parent/me").then((r) => setMe(r.data)).catch(() => {});
    api.get("/parent/attendance").then((r) => setAtt(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const submitLeave = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/parent/leave", leave);
      toast.success(t("save"));
      setLeave({ status: "sakit", date: today, note: "" });
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const submitPw = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/auth/change-password", pw);
      toast.success(t("password_changed"));
      setPw({ current_password: "", new_password: "" });
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const byDate = {};
  att.forEach((a) => { (byDate[a.date] = byDate[a.date] || {})[a.type] = a; });
  const days = Object.entries(byDate).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 60);
  const sumStatus = (d) => {
    const st = d.in?.att_status;
    if (st === "sakit" || st === "izin") return st;
    if (!d.in) return null;
    return d.in.status === "late" ? "late" : "ok";
  };
  const sumBadge = { ok: "bg-emerald-100 text-emerald-700", late: "bg-amber-100 text-amber-700", sakit: "bg-red-100 text-red-600", izin: "bg-sky-100 text-sky-700" };
  const sumLabel = { ok: t("present"), late: t("late_short"), sakit: t("att_sakit"), izin: t("att_izin") };

  return (
    <div data-testid="parent-home" className="space-y-6">
      {me && (
        <div className="bg-teal-800 text-white rounded-2xl p-5 flex flex-wrap items-center gap-4">
          {me.child.photo && <img src={me.child.photo} alt="" className="w-14 h-14 rounded-2xl object-cover bg-white/20" />}
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-wide text-teal-200">{t("child_activity")}</p>
            <p data-testid="child-name" className="font-bold text-lg truncate">{me.child.name}</p>
            <p className="text-xs text-teal-200">{[me.child.class, me.child.nis && `NIS ${me.child.nis}`].filter(Boolean).join(" · ")} · {me.school_name}</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <form onSubmit={submitLeave} data-testid="parent-leave-form" className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="font-bold text-slate-800 mb-4 flex items-center gap-2"><CalendarClock className="w-4 h-4 text-teal-700" /> {t("leave_title")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("status")}</label>
              <select data-testid="leave-status" value={leave.status} onChange={(e) => setLeave({ ...leave, status: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
                <option value="sakit">{t("att_sakit")}</option>
                <option value="izin">{t("att_izin")}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("ot_date")}</label>
              <input data-testid="leave-date" type="date" required value={leave.date} onChange={(e) => setLeave({ ...leave, date: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-500">{t("note")}</label>
              <input data-testid="leave-note" value={leave.note} onChange={(e) => setLeave({ ...leave, note: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
            </div>
          </div>
          <button data-testid="leave-submit" disabled={busy}
            className="mt-4 flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">
            <Send className="w-3.5 h-3.5" /> {t("leave_title")}
          </button>
        </form>

        <form onSubmit={submitPw} data-testid="parent-pw-form" className="bg-white rounded-2xl border border-slate-200 p-5">
          <p className="font-bold text-slate-800 mb-4 flex items-center gap-2"><KeyRound className="w-4 h-4 text-teal-700" /> {t("change_password")}</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("current_password")}</label>
              <input data-testid="pw-current" type="password" required value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("new_password")}</label>
              <input data-testid="pw-new" type="password" required minLength={6} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
            </div>
          </div>
          <button data-testid="pw-submit" disabled={busy}
            className="mt-4 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">{t("change_password")}</button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <p className="px-4 pt-4 font-bold text-slate-800">{t("child_activity")}</p>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-3">{t("date")}</th>
                <th className="px-4 py-3">{t("check_in")}</th>
                <th className="px-4 py-3">{t("check_out")}</th>
                <th className="px-4 py-3">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {days.map(([date, d]) => {
                const s = sumStatus(d);
                return (
                  <tr key={date} data-testid={`att-day-${date}`} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{date}</td>
                    <td className="px-4 py-3 font-mono text-xs">{d.in?.time_local || "—"}{d.in?.late_minutes > 0 && <span className="text-amber-600 font-sans"> (+{d.in.late_minutes}m)</span>}</td>
                    <td className="px-4 py-3 font-mono text-xs">{d.out?.time_local || "—"}</td>
                    <td className="px-4 py-3">
                      {s ? <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${sumBadge[s]}`}>{sumLabel[s]}</span> : <span className="text-slate-300">—</span>}
                      {(d.in?.note || d.out?.note) && <span className="ml-1.5 text-[11px] text-slate-400">{d.in?.note || d.out?.note}</span>}
                    </td>
                  </tr>
                );
              })}
              {days.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
