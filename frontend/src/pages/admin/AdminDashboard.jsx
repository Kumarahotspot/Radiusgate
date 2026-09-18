import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../api";
import { Users, Clock, CalendarClock, GraduationCap, UserCheck } from "lucide-react";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [today, setToday] = useState([]);

  useEffect(() => {
    api.get("/admin/stats").then((r) => setStats(r.data));
    api.get("/admin/today").then((r) => setToday(r.data));
  }, []);

  const cards = stats ? [
    { icon: UserCheck, label: t("present_today"), val: stats.present_today, testid: "stat-present" },
    { icon: Clock, label: t("late_today"), val: stats.late_today, testid: "stat-late" },
    { icon: CalendarClock, label: t("pending_leaves"), val: stats.pending_leaves, testid: "stat-leaves" },
    { icon: Users, label: t("total_teachers"), val: stats.total_teachers, testid: "stat-teachers" },
    { icon: GraduationCap, label: t("total_students"), val: stats.total_students, testid: "stat-students" },
  ] : [];

  return (
    <div data-testid="admin-dashboard" className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map((s) => (
          <div key={s.testid} data-testid={s.testid} className="bg-white rounded-2xl border border-slate-200 p-4">
            <s.icon className="w-5 h-5 text-teal-700 mb-2" />
            <p className="text-2xl font-extrabold text-slate-800">{s.val}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <p className="px-4 py-3 font-bold text-slate-800 border-b text-sm">{t("today_attendance")}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-2.5">{t("name")}</th>
                <th className="px-4 py-2.5">{t("type")}</th>
                <th className="px-4 py-2.5">{t("time")}</th>
                <th className="px-4 py-2.5">{t("status")}</th>
                <th className="px-4 py-2.5">GPS</th>
              </tr>
            </thead>
            <tbody>
              {today.map((a) => (
                <tr key={a.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{a.teacher_name}</td>
                  <td className="px-4 py-2.5">{a.type === "in" ? t("check_in") : t("check_out")}</td>
                  <td className="px-4 py-2.5">{(a.ts_device || a.ts_server || "").slice(11, 16)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.status === "late" ? "bg-amber-100 text-amber-700" : a.status === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                      {a.status}{a.offline ? ` · ${t("offline_badge")}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">{a.lat?.toFixed(5)}, {a.lng?.toFixed(5)}</td>
                </tr>
              ))}
              {today.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
