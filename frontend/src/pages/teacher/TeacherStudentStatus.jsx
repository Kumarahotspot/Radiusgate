import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import { UserCheck } from "lucide-react";

export default function TeacherStudentStatus() {
  const { t } = useTranslation();
  const [ssStudents, setSsStudents] = useState([]);
  const [studentStatuses, setStudentStatuses] = useState([]);
  const [ssForm, setSsForm] = useState({
    student_id: "",
    status: "sakit",
    date: new Date().toISOString().slice(0, 10),
    note: "",
  });
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get("/teacher/students").then((r) => setSsStudents(r.data));
    api.get("/teacher/student-status").then((r) => setStudentStatuses(r.data));
  };
  useEffect(() => { load(); }, []);

  const markStatus = async (e) => {
    e.preventDefault();
    if (!ssForm.student_id) return;
    setBusy(true);
    try {
      await api.post("/teacher/student-status", ssForm);
      toast.success(t("status_recorded"));
      setSsForm({ student_id: "", status: "sakit", date: new Date().toISOString().slice(0, 10), note: "" });
      load();
    } catch (err) {
      const d = err.response?.data?.detail || "";
      toast.error(d === "already_recorded" ? t("student_already") : errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="teacher-student-status-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{t("student_status_title")}</h2>
          <p className="text-xs text-slate-500">Catat izin atau sakit siswa untuk hari ini atau tanggal tertentu.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm" data-testid="student-status-card">
        <form onSubmit={markStatus} data-testid="student-status-form" className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs font-semibold text-slate-500">{t("select_student")}</label>
            <select
              data-testid="ss-student"
              required
              value={ssForm.student_id}
              onChange={(e) => setSsForm({ ...ssForm, student_id: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600"
            >
              <option value="">— {t("select_student")} —</option>
              {ssStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.class ? `(${s.class})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("status")}</label>
            <select
              data-testid="ss-status"
              value={ssForm.status}
              onChange={(e) => setSsForm({ ...ssForm, status: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600"
            >
              <option value="sakit">{t("sakit")}</option>
              <option value="izin">{t("izin")}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("date_from")}</label>
            <input
              data-testid="ss-date"
              type="date"
              required
              value={ssForm.date}
              onChange={(e) => setSsForm({ ...ssForm, date: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="text-xs font-semibold text-slate-500">{t("note")}</label>
            <input
              data-testid="ss-note"
              placeholder="Contoh: Surat dokter / acara keluarga"
              value={ssForm.note}
              onChange={(e) => setSsForm({ ...ssForm, note: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600"
            />
          </div>
          <button
            data-testid="ss-submit"
            disabled={busy}
            className="col-span-2 sm:col-span-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 transition-colors"
          >
            {busy ? t("loading") : t("mark_submit")}
          </button>
        </form>

        {studentStatuses.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold uppercase text-slate-400 mb-3 tracking-wider">Riwayat Status Siswa Terkini</p>
            <div className="space-y-2">
              {studentStatuses.map((r) => (
                <div
                  key={r.id}
                  data-testid={`ss-row-${r.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 rounded-xl px-4 py-2.5 text-sm border border-slate-100"
                >
                  <span className="font-semibold text-slate-700">
                    {r.teacher_name} {r.class ? `· ${r.class}` : ""} · {r.date}
                    {r.recorded_by_name && <span className="text-xs text-slate-400 font-normal"> · dicatat oleh {r.recorded_by_name}</span>}
                    {r.note && <span className="text-xs text-slate-500 font-normal"> ({r.note})</span>}
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      r.att_status === "sakit" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {t(r.att_status)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
