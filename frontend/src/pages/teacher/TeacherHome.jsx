import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import { CalendarClock, Plus } from "lucide-react";

export default function TeacherHome() {
  const { t } = useTranslation();
  const [history, setHistory] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "izin", date_from: "", date_to: "", reason: "" });

  const [ssStudents, setSsStudents] = useState([]);
  const [studentStatuses, setStudentStatuses] = useState([]);
  const [ssForm, setSsForm] = useState({ student_id: "", status: "sakit", date: new Date().toISOString().slice(0, 10), note: "" });

  const load = () => {
    api.get("/teacher/attendance").then((r) => setHistory(r.data));
    api.get("/teacher/leaves").then((r) => setLeaves(r.data));
    api.get("/teacher/students").then((r) => setSsStudents(r.data));
    api.get("/teacher/student-status").then((r) => setStudentStatuses(r.data));
  };
  useEffect(() => { load(); }, []);

  const markStatus = async (e) => {
    e.preventDefault();
    if (!ssForm.student_id) return;
    try {
      await api.post("/teacher/student-status", ssForm);
      toast.success(t("status_recorded"));
      setSsForm({ student_id: "", status: "sakit", date: new Date().toISOString().slice(0, 10), note: "" });
      load();
    } catch (err) {
      const d = err.response?.data?.detail || "";
      toast.error(d === "already_recorded" ? t("student_already") : errMsg(err));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/teacher/leaves", form);
      toast.success(t("leave_submitted"));
      setShowForm(false);
      setForm({ type: "izin", date_from: "", date_to: "", reason: "" });
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const badge = (s) => s === "approved" ? "bg-emerald-100 text-emerald-700" : s === "rejected" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700";

  return (
    <div data-testid="teacher-home" className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">{t("my_history")}</h2>
        <button data-testid="request-leave-btn" onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> {t("request_leave")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} data-testid="leave-form" className="bg-white rounded-2xl border border-slate-200 p-5 grid sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("type")}</label>
            <select data-testid="leave-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
              <option value="izin">{t("izin")}</option>
              <option value="sakit">{t("sakit")}</option>
              <option value="cuti">{t("cuti")}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("date_from")}</label>
            <input data-testid="leave-from" type="date" required value={form.date_from} onChange={(e) => setForm({ ...form, date_from: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("date_to")}</label>
            <input data-testid="leave-to" type="date" required value={form.date_to} onChange={(e) => setForm({ ...form, date_to: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("reason")}</label>
            <input data-testid="leave-reason" required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div className="sm:col-span-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">{t("cancel")}</button>
            <button data-testid="leave-submit" className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800">{t("submit")}</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5" data-testid="student-status-card">
        <p className="font-bold text-slate-800 text-sm mb-3">{t("student_status_title")}</p>
        <form onSubmit={markStatus} data-testid="student-status-form" className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs font-semibold text-slate-500">{t("select_student")}</label>
            <select data-testid="ss-student" required value={ssForm.student_id} onChange={(e) => setSsForm({ ...ssForm, student_id: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
              <option value="">—</option>
              {ssStudents.map((s) => <option key={s.id} value={s.id}>{s.name}{s.class ? ` (${s.class})` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("status")}</label>
            <select data-testid="ss-status" value={ssForm.status} onChange={(e) => setSsForm({ ...ssForm, status: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
              <option value="sakit">{t("sakit")}</option>
              <option value="izin">{t("izin")}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("date_from")}</label>
            <input data-testid="ss-date" type="date" required value={ssForm.date} onChange={(e) => setSsForm({ ...ssForm, date: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs font-semibold text-slate-500">{t("note")}</label>
            <input data-testid="ss-note" value={ssForm.note} onChange={(e) => setSsForm({ ...ssForm, note: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <button data-testid="ss-submit" className="col-span-2 sm:col-span-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800">
            {t("mark_submit")}
          </button>
        </form>
        {studentStatuses.length > 0 && (
          <div className="mt-4 space-y-2">
            {studentStatuses.map((r) => (
              <div key={r.id} data-testid={`ss-row-${r.id}`} className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 rounded-xl px-4 py-2.5 text-sm">
                <span className="font-semibold text-slate-700">
                  {r.teacher_name}{r.class ? ` · ${r.class}` : ""} · {r.date}
                  {r.recorded_by_name && <span className="text-xs text-slate-400 font-normal"> · {r.recorded_by_name}</span>}
                  {r.note && <span className="text-xs text-slate-400 font-normal"> · {r.note}</span>}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${r.att_status === "sakit" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"}`}>{t(r.att_status)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {leaves.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2"><CalendarClock className="w-4 h-4 text-teal-700" /> {t("leaves")}</p>
          <div className="space-y-2">
            {leaves.map((l) => (
              <div key={l.id} data-testid={`my-leave-${l.id}`} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5 text-sm">
                <span className="font-semibold text-slate-700">{t(l.type)} · {l.date_from} → {l.date_to}</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge(l.status)}`}>{t(l.status)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-3">{t("date_from")}</th>
                <th className="px-4 py-3">{t("type")}</th>
                <th className="px-4 py-3">{t("time")}</th>
                <th className="px-4 py-3">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5">{h.date}</td>
                  <td className="px-4 py-2.5">{h.type === "in" ? t("check_in") : t("check_out")}</td>
                  <td className="px-4 py-2.5">{h.time_local || (h.ts_device || "").slice(11, 16)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${h.status === "late" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{h.status}</span>
                  </td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
