import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api from "../../api";
import { Users, Clock, CalendarClock, GraduationCap, UserCheck, Trash2, BookOpen, Search, ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [today, setToday] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const q = query.trim().toLowerCase();
  const filtered = today.filter((a) => !q || [a.teacher_name, a.status, a.class, a.type === "in" ? t("check_in") : t("check_out")].some((f) => (f || "").toLowerCase().includes(q)));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const load = () => {
    api.get("/admin/stats").then((r) => setStats(r.data));
    api.get("/admin/today").then((r) => setToday(r.data));
  };
  useEffect(() => { load(); }, []);

  const delAttendance = async (id) => {
    if (!window.confirm(t("confirm_delete"))) return;
    await api.delete(`/admin/attendance/${id}`);
    toast.success(t("delete"));
    load();
  };

  const cards = stats ? [
    { icon: UserCheck, label: t("present_today"), val: stats.present_today, testid: "stat-present" },
    { icon: BookOpen, label: t("students_present"), val: stats.students_present ?? 0, testid: "stat-students-present" },
    { icon: Clock, label: t("late_today"), val: stats.late_today, testid: "stat-late" },
    { icon: CalendarClock, label: t("pending_leaves"), val: stats.pending_leaves, testid: "stat-leaves" },
    { icon: Users, label: t("total_teachers"), val: stats.total_teachers, testid: "stat-teachers" },
    { icon: GraduationCap, label: t("total_students"), val: stats.total_students, testid: "stat-students" },
  ] : [];

  return (
    <div data-testid="admin-dashboard" className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {cards.map((s) => (
          <div key={s.testid} data-testid={s.testid} className="bg-white rounded-2xl border border-slate-200 p-4">
            <s.icon className="w-5 h-5 text-teal-700 mb-2" />
            <p className="text-2xl font-extrabold text-slate-800">{s.val}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b">
          <p className="font-bold text-slate-800 text-sm">{t("today_attendance")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">{t("show_entries")}</span>
              <select data-testid="today-page-size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition">
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input data-testid="today-search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder={t("search_attendance")}
                className="w-full sm:w-56 rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition" />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-2.5">{t("name")}</th>
                <th className="px-4 py-2.5">{t("type")}</th>
                <th className="px-4 py-2.5">{t("time")}</th>
                <th className="px-4 py-2.5">{t("status")}</th>
                <th className="px-4 py-2.5">GPS</th>
                <th className="px-4 py-2.5">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-slate-800">
                    {a.teacher_name}
                    {a.person_type === "student" && <span className="ml-1.5 text-[10px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-full">{t("mode_student")}{a.class ? ` · ${a.class}` : ""}</span>}
                  </td>
                  <td className="px-4 py-2.5">{a.type === "in" ? t("check_in") : t("check_out")}</td>
                  <td className="px-4 py-2.5">{a.time_local || (a.ts_device || "").slice(11, 16)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.status === "late" ? "bg-amber-100 text-amber-700" : a.status === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                      {a.status}{a.offline ? ` · ${t("offline_badge")}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">{a.lat?.toFixed(5)}, {a.lng?.toFixed(5)}</td>
                  <td className="px-4 py-2.5">
                    <button data-testid={`delete-attendance-${a.id}`} onClick={() => delAttendance(a.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50/60">
            <p data-testid="today-page-info" className="text-xs text-slate-500">
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} {t("of")} {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button data-testid="today-prev-page" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <span data-testid="today-page-num" className="text-xs font-bold text-slate-700 px-1">{safePage}/{totalPages}</span>
              <button data-testid="today-next-page" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}
                className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
