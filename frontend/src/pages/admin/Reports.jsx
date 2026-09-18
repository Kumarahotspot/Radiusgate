import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../api";
import { FileSpreadsheet, FileText } from "lucide-react";

export default function Reports() {
  const { t } = useTranslation();
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [teacherId, setTeacherId] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [rows, setRows] = useState([]);

  useEffect(() => { api.get("/admin/teachers").then((r) => setTeachers(r.data)); }, []);

  const load = () => api.get("/admin/reports/attendance", { params: { date_from: from, date_to: to, teacher_id: teacherId || undefined } })
    .then((r) => setRows(r.data));
  useEffect(() => { load(); }, [from, to, teacherId]);

  const exportUrl = (fmt) =>
    `${process.env.REACT_APP_BACKEND_URL}/api/admin/reports/export?format=${fmt}&date_from=${from}&date_to=${to}`;

  const doExport = async (fmt) => {
    const r = await api.get("/admin/reports/export", { params: { format: fmt, date_from: from, date_to: to }, responseType: "blob" });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fmt === "xlsx" ? "laporan-absensi.xlsx" : "laporan-absensi.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="reports-page" className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">{t("reports")}</h2>
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
          <label className="text-xs font-semibold text-slate-500">{t("teachers")}</label>
          <select data-testid="report-teacher" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}
            className="mt-1 block rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600 bg-white">
            <option value="">{t("all_teachers")}</option>
            {teachers.map((tc) => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
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
              {rows.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
