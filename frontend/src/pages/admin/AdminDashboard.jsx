import { useEffect, useState, Fragment, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api from "../../api";
import { Users, Clock, CalendarClock, GraduationCap, UserCheck, Trash2, BookOpen, Search, ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [today, setToday] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expanded, setExpanded] = useState(null);
  const [flt, setFlt] = useState(() => new URLSearchParams(window.location.search).get("f") || "");
  const tableRef = useRef(null);
  const q = query.trim().toLowerCase();
  const filtered = today.filter((a) => !q || [a.teacher_name, a.status, a.class, a.type === "in" ? t("check_in") : t("check_out")].some((f) => (f || "").toLowerCase().includes(q)));
  const byFlt = flt === "late" ? filtered.filter((a) => a.status === "late")
    : flt ? filtered.filter((a) => (a.person_type || "teacher") === flt)
    : filtered;
  const groupsMap = new Map();
  for (const a of byFlt) {
    const k = a.student_id || a.teacher_id || `${a.teacher_name}|${a.person_type}`;
    if (!groupsMap.has(k)) groupsMap.set(k, { key: k, name: a.teacher_name, person_type: a.person_type, cls: a.class, rows: [] });
    groupsMap.get(k).rows.push(a);
  }
  const groups = [...groupsMap.values()];
  const totalPages = Math.max(1, Math.ceil(groups.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = groups.slice((safePage - 1) * pageSize, safePage * pageSize);

  const load = () => {
    api.get("/admin/stats").then((r) => setStats(r.data));
    api.get("/admin/today").then((r) => setToday(r.data));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (flt && tableRef.current) tableRef.current.scrollIntoView({ behavior: "smooth", block: "start" }); }, [flt]);

  const delAttendance = async (id) => {
    if (!window.confirm(t("confirm_delete"))) return;
    await api.delete(`/admin/attendance/${id}`);
    toast.success(t("delete"));
    load();
  };

  const toggleFlt = (v) => setFlt((cur) => (cur === v ? "" : v));
  const cards = stats ? [
    { icon: UserCheck, label: t("present_today"), val: stats.present_today, testid: "stat-present", on: () => toggleFlt("teacher"), active: flt === "teacher" },
    { icon: BookOpen, label: t("students_present"), val: stats.students_present ?? 0, testid: "stat-students-present", on: () => toggleFlt("student"), active: flt === "student" },
    { icon: Clock, label: t("late_today"), val: stats.late_today, testid: "stat-late", on: () => toggleFlt("late"), active: flt === "late" },
    { icon: CalendarClock, label: t("pending_leaves"), val: stats.pending_leaves, testid: "stat-leaves", on: () => navigate("/admin/leaves") },
    { icon: Users, label: t("total_teachers"), val: stats.total_teachers, testid: "stat-teachers", on: () => navigate("/admin/teachers") },
    { icon: GraduationCap, label: t("total_students"), val: stats.total_students, testid: "stat-students", on: () => navigate("/admin/students") },
    { icon: Users, label: t("employees_present"), val: stats.employees_present ?? 0, testid: "stat-employees", on: () => toggleFlt("employee"), active: flt === "employee" },
  ] : [];

  return (
    <div data-testid="admin-dashboard" className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {cards.map((s) => (
          <button key={s.testid} data-testid={s.testid} onClick={s.on}
            className={`bg-white rounded-2xl border p-4 text-left transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${s.active ? "border-teal-600 ring-2 ring-teal-600/20" : "border-slate-200"}`}>
            <s.icon className="w-5 h-5 text-teal-700 mb-2" />
            <p className="text-2xl font-extrabold text-slate-800">{s.val}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      <div ref={tableRef} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b">
          <p className="font-bold text-slate-800 text-sm">{t("today_attendance")}</p>
          {flt && (
            <button data-testid="clear-filter" onClick={() => setFlt("")}
              className="flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-full transition-colors">
              {{ teacher: t("present_today"), student: t("students_present"), late: t("late_today"), employee: t("employees_present") }[flt]}
              <X className="w-3 h-3" />
            </button>
          )}
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
                <th className="px-4 py-2.5">{t("check_in")}</th>
                <th className="px-4 py-2.5">{t("check_out")}</th>
                <th className="px-4 py-2.5">{t("status")}</th>
                <th className="px-4 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((g) => {
                const ins = g.rows.filter((r) => r.type === "in");
                const outs = g.rows.filter((r) => r.type === "out");
                const inR = ins[0];
                const outR = outs[0];
                const att = inR?.att_status;
                const summary = att === "sakit" || att === "izin" ? att : ins.length && outs.length ? "complete" : ins.length ? "in_only" : "out_only";
                const badgeCls = summary === "complete" ? "bg-emerald-100 text-emerald-700" : summary === "sakit" ? "bg-red-100 text-red-600" : summary === "izin" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700";
                const sumLabel = summary === "sakit" ? t("sakit") : summary === "izin" ? t("izin") : t(`att_sum_${summary}`);
                const isOpen = expanded === g.key;
                return (
                  <Fragment key={g.key}>
                    <tr data-testid={`person-row-${g.key}`} onClick={() => setExpanded(isOpen ? null : g.key)}
                      className={`border-b cursor-pointer transition-colors ${isOpen ? "bg-teal-50/60" : "hover:bg-slate-50"}`}>
                      <td className="px-4 py-2.5 font-semibold text-slate-800">
                        {g.name}
                        {g.person_type === "student" && <span className="ml-1.5 text-[10px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-full">{t("mode_student")}{g.cls ? ` · ${g.cls}` : ""}</span>}
                        {g.person_type === "employee" && <span className="ml-1.5 text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full">{t("employees")}</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {inR ? (
                          <>
                            {inR.time_local || (inR.ts_device || "").slice(11, 16)}
                            {inR.status === "late" && <span className="ml-1.5 text-[10px] font-bold text-amber-600">+{inR.late_minutes} mnt</span>}
                          </>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5">{outR ? (outR.time_local || (outR.ts_device || "").slice(11, 16)) : <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-2.5"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>{sumLabel}</span></td>
                      <td className="px-4 py-2.5"><ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} /></td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b bg-slate-50/70" data-testid={`person-detail-${g.key}`}>
                        <td colSpan={5} className="px-4 py-3">
                          <div className="grid sm:grid-cols-2 gap-2">
                            {[["in", inR], ["out", outR]].map(([tp, r]) => (
                              <div key={tp} className="rounded-xl border border-slate-200 bg-white p-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-bold uppercase text-slate-500">{tp === "in" ? t("check_in") : t("check_out")}</p>
                                  {r && (
                                    <button data-testid={`delete-attendance-${r.id}`} onClick={(e) => { e.stopPropagation(); delAttendance(r.id); }}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                  )}
                                </div>
                                {r ? (
                                  <div className="mt-1 text-sm text-slate-700 space-y-1">
                                    <p>{t("time")}: <span className="font-semibold">{r.time_local || (r.ts_device || "").slice(11, 16)}</span></p>
                                    <p>
                                      {t("status")}:{" "}
                                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.status === "late" ? "bg-amber-100 text-amber-700" : r.status === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                                        {r.status}{r.offline ? ` · ${t("offline_badge")}` : ""}
                                      </span>
                                      {r.late_minutes > 0 && <span className="ml-1.5 text-xs text-amber-600 font-semibold">{r.late_minutes} mnt</span>}
                                    </p>
                                    <p className="text-xs text-slate-400 font-mono">GPS: {r.lat?.toFixed(5)}, {r.lng?.toFixed(5)}</p>
                                    {r.note && <p className="text-xs text-slate-500">{t("note")}: {r.note}</p>}
                                  </div>
                                ) : (
                                  <p className="mt-1 text-xs text-slate-400">{t("no_data")}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {paged.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
        {groups.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50/60">
            <p data-testid="today-page-info" className="text-xs text-slate-500">
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, groups.length)} {t("of")} {groups.length}
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

      {stats?.parent_data && stats.parent_data.total > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4" data-testid="parent-data-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-slate-800 text-sm">{t("parent_data_completeness")}</p>
            <p className="text-xs text-slate-500">
              {t("parent_phone")}: <strong className="text-slate-700">{stats.parent_data.with_phone}/{stats.parent_data.total}</strong>
              {" · "}{t("parent_data_complete")}: <strong className="text-slate-700">{stats.parent_data.with_complete}/{stats.parent_data.total}</strong>
            </p>
          </div>
          <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
            {stats.parent_data.per_class.map((c) => (
              <button key={c.class} data-testid={`pc-${c.class}`} title={t("view_class_students")}
                onClick={() => navigate(`/admin/students?q=${encodeURIComponent(c.class)}`)}
                className="flex items-center gap-3 w-full text-left rounded-lg px-1.5 py-1 -mx-1.5 hover:bg-teal-50/70 transition-colors cursor-pointer">
                <p className="w-28 truncate text-xs font-semibold text-slate-600">{c.class}</p>
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-teal-600 rounded-full transition-all" style={{ width: `${c.total ? (c.phone / c.total) * 100 : 0}%` }} />
                </div>
                <p className="w-24 text-right text-[11px] text-slate-500 shrink-0">{c.phone}/{c.total} {t("parent_phone_short")}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
