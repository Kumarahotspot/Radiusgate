import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../api";
import { FileSpreadsheet, FileText } from "lucide-react";

const PERSON_META = {
  student: { prefix: "st", slug: "siswa", showClass: true },
  teacher: { prefix: "tc", slug: "guru", showClass: false },
  employee: { prefix: "emp", slug: "karyawan", showClass: false },
};

function PersonReport({ t, person, from, to, setFrom, setTo, classes }) {
  const meta = PERSON_META[person];
  const p = meta.prefix;
  const [cls, setCls] = useState("");
  const [rows, setRows] = useState([]);
  const [recap, setRecap] = useState([]);
  const [sub, setSub] = useState("daily");
  const refLabel = person === "student" ? t("nis") : t("nip");
  const grpLabel = person === "student" ? t("class") : person === "teacher" ? t("mapel") : t("department");

  useEffect(() => {
    const params = { person, date_from: from, date_to: to };
    if (meta.showClass && cls) params.class_name = cls;
    api.get("/admin/reports/people", { params }).then((r) => setRows(r.data));
    api.get("/admin/reports/people/recap", { params }).then((r) => setRecap(r.data));
  }, [person, from, to, cls, meta.showClass]);

  const doExport = async (fmt) => {
    const params = { person, format: fmt, kind: sub, date_from: from, date_to: to };
    if (meta.showClass && cls) params.class_name = cls;
    const r = await api.get("/admin/reports/people/export", { params, responseType: "blob" });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement("a");
    a.href = url;
    const base = sub === "recap" ? `rekap-kehadiran-${meta.slug}` : `laporan-${meta.slug}`;
    a.download = `${base}.${fmt === "xlsx" ? "xlsx" : "pdf"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">{t("from")}</label>
          <input data-testid={`${p}-from`} type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">{t("to")}</label>
          <input data-testid={`${p}-to`} type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
        </div>
        {meta.showClass && (
          <div className="min-w-0 max-w-full">
            <label className="text-xs font-semibold text-slate-500">{t("class")}</label>
            <select data-testid={`${p}-class`} value={cls} onChange={(e) => setCls(e.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white">
              <option value="">{t("all_classes")}</option>
              {(classes || []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        <div className="flex gap-2 ml-auto">
          <button data-testid={`${p}-export-xlsx`} onClick={() => doExport("xlsx")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
            <FileSpreadsheet className="w-4 h-4" /> {t("export_xlsx")}
          </button>
          <button data-testid={`${p}-export-pdf`} onClick={() => doExport("pdf")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
            <FileText className="w-4 h-4" /> {t("export_pdf")}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button data-testid={`${p}-tab-daily`} onClick={() => setSub("daily")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${sub === "daily" ? "bg-teal-700 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
          {t("tab_daily")} ({rows.length})
        </button>
        <button data-testid={`${p}-tab-recap`} onClick={() => setSub("recap")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${sub === "recap" ? "bg-teal-700 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
          {t("tab_recap")} ({recap.length})
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          {sub === "daily" ? (
            <table data-testid={`${p}-daily-table`} className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                  <th className="px-4 py-3">{t("date")}</th>
                  <th className="px-4 py-3">{t("name")}</th>
                  <th className="px-4 py-3">{grpLabel}</th>
                  <th className="px-4 py-3">{t("type")}</th>
                  <th className="px-4 py-3">{t("time")}</th>
                  <th className="px-4 py-3">{t("status")}</th>
                  <th className="px-4 py-3">{t("telat")} (mnt)</th>
                  <th className="px-4 py-3">{t("overtime_min")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = r.att_status && r.att_status !== "present" ? r.att_status : r.status;
                  return (
                    <tr key={r.id} data-testid={`${p}-row-${r.id}`} className="border-b last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 text-slate-600">{r.date}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{r.teacher_name}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.class || r.department || "-"}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.type === "in" ? t("check_in") : t("check_out")}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{st === "sakit" || st === "izin" ? "-" : r.time}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${st === "ok" ? "bg-emerald-100 text-emerald-700" : st === "late" ? "bg-amber-100 text-amber-700" : st === "sakit" ? "bg-red-100 text-red-600" : "bg-sky-100 text-sky-700"}`}>
                          {st}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{r.late_minutes || 0}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.overtime_minutes || 0}</td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
              </tbody>
            </table>
          ) : (
            <table data-testid={`${p}-recap-table`} className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                  <th className="px-4 py-3">{t("name")}</th>
                  <th className="px-4 py-3">{refLabel}</th>
                  <th className="px-4 py-3">{grpLabel}</th>
                  <th className="px-4 py-3 text-emerald-700">{t("hadir")}</th>
                  <th className="px-4 py-3 text-amber-700">{t("telat")}</th>
                  <th className="px-4 py-3 text-red-600">{t("sakit")}</th>
                  <th className="px-4 py-3 text-sky-700">{t("izin")}</th>
                  <th className="px-4 py-3 text-rose-700">{t("alpha")}</th>
                  <th className="px-4 py-3">{t("active_days")}</th>
                </tr>
              </thead>
              <tbody>
                {recap.map((r) => (
                  <tr key={r.id} data-testid={`${p}-recap-row-${r.id}`} className="border-b last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{r.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.ref || "-"}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.group || "-"}</td>
                    <td className="px-4 py-2.5 font-bold text-emerald-600">{r.hadir}</td>
                    <td className="px-4 py-2.5 font-bold text-amber-600">{r.telat}</td>
                    <td className="px-4 py-2.5 font-bold text-red-600">{r.sakit}</td>
                    <td className="px-4 py-2.5 font-bold text-sky-600">{r.izin}</td>
                    <td className="px-4 py-2.5 font-bold text-rose-600">{r.alpha}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.active_days}</td>
                  </tr>
                ))}
                {recap.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

export default function Reports() {
  const { t } = useTranslation();
  const today = new Date().toLocaleDateString("en-CA");
  const monthAgo = new Date(Date.now() - 29 * 864e5).toLocaleDateString("en-CA");
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [person, setPerson] = useState("");
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState("daily");
  const [opts, setOpts] = useState({ classes: [], subjects: [] });
  const [saClass, setSaClass] = useState("");
  const [saSubject, setSaSubject] = useState("");
  const [saRows, setSaRows] = useState([]);
  const [sessDate, setSessDate] = useState(today);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    api.get("/admin/meta/options").then((r) => setOpts(r.data));
  }, []);

  const load = () => api.get("/admin/reports/attendance", { params: { date_from: from, date_to: to, person: person || undefined } })
    .then((r) => setRows(r.data));
  useEffect(() => { load(); }, [from, to, person]);

  useEffect(() => {
    if (tab !== "subject") return;
    api.get("/admin/subject-attendance", {
      params: { date_from: from, date_to: to, class_name: saClass || undefined, subject: saSubject || undefined },
    }).then((r) => setSaRows(r.data));
  }, [tab, from, to, saClass, saSubject]);

  useEffect(() => {
    if (tab !== "sessions") return;
    api.get("/admin/subject-sessions", { params: { date: sessDate } }).then((r) => setSessions(r.data));
  }, [tab, sessDate]);

  const toggleLock = async (s) => {
    await api.post("/admin/subject-sessions/lock", {
      date: sessDate, teacher_id: s.teacher_id, subject: s.subject, class_name: s.class_name, lock: !s.locked,
    });
    setSessions(sessions.map((x) => (x === s ? { ...x, locked: !s.locked } : x)));
  };

  const doExport = async (fmt) => {
    const r = await api.get("/admin/reports/export", { params: { format: fmt, date_from: from, date_to: to, person: person || undefined }, responseType: "blob" });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fmt === "xlsx" ? "laporan-absensi.xlsx" : "laporan-absensi.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const [recapMonth, setRecapMonth] = useState(new Date().toLocaleDateString("en-CA").slice(0, 7));
  const doRecapExport = async () => {
    const r = await api.get("/admin/subject-att/recap-export", { params: { month: recapMonth }, responseType: "blob" });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rekap-mapel-bulanan-${recapMonth}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const personProps = { t, from, to, setFrom, setTo };

  return (
    <div data-testid="reports-page" className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">{t("reports")}</h2>
      <div className="flex flex-wrap gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit max-w-full">
        <button data-testid="tab-daily" onClick={() => setTab("daily")}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === "daily" ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{t("daily_tab")}</button>
        <button data-testid="tab-subject" onClick={() => setTab("subject")}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === "subject" ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{t("subject_att_tab")}</button>
        <button data-testid="tab-students" onClick={() => setTab("students")}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === "students" ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{t("student_att_tab")}</button>
        <button data-testid="tab-teachers" onClick={() => setTab("teachers")}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === "teachers" ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{t("teacher_att_tab")}</button>
        <button data-testid="tab-employees" onClick={() => setTab("employees")}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === "employees" ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{t("employee_att_tab")}</button>
        <button data-testid="tab-sessions" onClick={() => setTab("sessions")}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === "sessions" ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{t("sessions_tab")}</button>
      </div>
      {tab === "subject" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-3" data-testid="subject-recap-panel">
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("sa_recap_month")}</label>
            <input data-testid="recap-month" type="month" value={recapMonth} onChange={(e) => setRecapMonth(e.target.value)}
              className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
          </div>
          <button data-testid="recap-export-btn" onClick={doRecapExport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
            <FileSpreadsheet className="w-4 h-4" /> {t("sa_recap_export")}
          </button>
        </div>
      )}
      {tab === "daily" && (<>
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-semibold text-slate-500">{t("from")}</label>
          <input data-testid="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">{t("to")}</label>
          <input data-testid="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500">{t("type")}</label>
          <select data-testid="report-person" value={person} onChange={(e) => setPerson(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white">
            <option value="">{t("all_people")}</option>
            <option value="student">{t("students")}</option>
            <option value="teacher">{t("teachers")}</option>
          </select>
        </div>
        <div className="flex gap-2 ml-auto">
          <button data-testid="export-xlsx-btn" onClick={() => doExport("xlsx")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
            <FileSpreadsheet className="w-4 h-4" /> {t("export_xlsx")}
          </button>
          <button data-testid="export-pdf-btn" onClick={() => doExport("pdf")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
            <FileText className="w-4 h-4" /> {t("export_pdf")}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-3">{t("date_from")}</th>
                <th className="px-4 py-3">{t("name")}</th>
                <th className="px-4 py-3">{t("nisn")}</th>
                <th className="px-4 py-3">{t("gender_short")}</th>
                <th className="px-4 py-3">{t("type")}</th>
                <th className="px-4 py-3">{t("time")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("late_min")}</th>
                <th className="px-4 py-3">{t("overtime_min")}</th>
                <th className="px-4 py-3">GPS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5">{r.date}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{r.teacher_name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{r.nisn || "-"}</td>
                  <td className="px-4 py-2.5">{r.gender || "-"}</td>
                  <td className="px-4 py-2.5">{r.type === "in" ? t("check_in") : t("check_out")}</td>
                  <td className="px-4 py-2.5">{r.time}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.status === "late" ? "bg-amber-100 text-amber-700" : r.status === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                      {r.status}{r.offline ? ` · ${t("offline_badge")}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">{r.late_minutes || 0}</td>
                  <td className="px-4 py-2.5">{r.overtime_minutes || 0}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{r.lat?.toFixed(4)}, {r.lng?.toFixed(4)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      </>)}

      {tab === "subject" && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("from")}</label>
              <input data-testid="sa-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("to")}</label>
              <input data-testid="sa-to" type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
            </div>
            <div className="min-w-0 max-w-full">
              <label className="text-xs font-semibold text-slate-500">{t("class")}</label>
              <select data-testid="sa-class" value={saClass} onChange={(e) => setSaClass(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white">
                <option value="">{t("all_classes")}</option>
                {(opts.classes || []).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="min-w-0 max-w-full">
              <label className="text-xs font-semibold text-slate-500">{t("mapel")}</label>
              <select data-testid="sa-subject" value={saSubject} onChange={(e) => setSaSubject(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white">
                <option value="">{t("all_subjects")}</option>
                {(opts.subjects || []).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                    <th className="px-4 py-3">{t("date")}</th>
                    <th className="px-4 py-3">{t("class")}</th>
                    <th className="px-4 py-3">{t("mapel")}</th>
                    <th className="px-4 py-3">{t("teachers")}</th>
                    <th className="px-4 py-3">{t("name")}</th>
                    <th className="px-4 py-3">{t("nis")}</th>
                    <th className="px-4 py-3">{t("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {saRows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-mono text-xs">{r.date}</td>
                      <td className="px-4 py-2.5">{r.class_name}</td>
                      <td className="px-4 py-2.5">{r.subject}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.teacher_name}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">{r.student_name}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{r.nis || "-"}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.status === "hadir" ? "bg-emerald-100 text-emerald-700" : r.status === "sakit" ? "bg-red-100 text-red-600" : r.status === "izin" ? "bg-sky-100 text-sky-700" : "bg-slate-200 text-slate-600"}`}>
                          {t(`att_${r.status}`)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {saRows.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === "sessions" && (<>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("date")}</label>
            <input data-testid="sessions-date" type="date" value={sessDate} onChange={(e) => setSessDate(e.target.value)}
              className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
          </div>
          <p className="text-[11px] text-slate-400 max-w-md">{t("sessions_hint")}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                  <th className="px-4 py-3">{t("class")}</th>
                  <th className="px-4 py-3">{t("mapel")}</th>
                  <th className="px-4 py-3">{t("teachers")}</th>
                  <th className="px-4 py-3">{t("students")}</th>
                  <th className="px-4 py-3">{t("status")}</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={`${s.teacher_id}-${s.subject}-${s.class_name}`} data-testid={`session-${s.class_name}-${s.subject}`} className="border-b last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5">{s.class_name}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{s.subject}</td>
                    <td className="px-4 py-2.5 text-slate-600">{s.teacher_name}</td>
                    <td className="px-4 py-2.5">{s.count}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.locked ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-700"}`}>
                        {s.locked ? t("session_locked") : t("session_open")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button data-testid={`session-lock-${s.class_name}-${s.subject}`} onClick={() => toggleLock(s)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-colors ${s.locked ? "text-teal-700 bg-teal-50 hover:bg-teal-100" : "text-slate-600 bg-slate-100 hover:bg-slate-200"}`}>
                        {s.locked ? t("unlock_session") : t("lock_action")}
                      </button>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </>)}

      {tab === "students" && <PersonReport {...personProps} person="student" classes={opts.classes || []} />}
      {tab === "teachers" && <PersonReport {...personProps} person="teacher" classes={[]} />}
      {tab === "employees" && <PersonReport {...personProps} person="employee" classes={[]} />}
    </div>
  );
}
