import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth, homeFor } from "../context/AuthContext";
import api from "../api";
import LangSwitch from "./LangSwitch";
import {
  LayoutDashboard, School, FileText, Users, GraduationCap, Settings,
  CalendarClock, BarChart3, CreditCard, LogOut, ScanFace, MonitorSmartphone, Bell, Inbox,
  Briefcase, Timer, Wallet, BookOpen, User, ChevronDown, Menu, X,
} from "lucide-react";

const menus = {
  owner: [
    { to: "/owner", icon: LayoutDashboard, key: "dashboard", end: true },
    { to: "/owner/invoices", icon: FileText, key: "invoices" },
    { to: "/owner/leads", icon: Inbox, key: "leads" },
    { to: "/owner/settings", icon: Bell, key: "notif_settings" },
  ],
  school_admin: [
    { to: "/admin", icon: LayoutDashboard, key: "dashboard", end: true },
    { to: "/admin/teachers", icon: Users, key: "teachers" },
    { to: "/admin/students", icon: GraduationCap, key: "students" },
    { to: "/admin/employees", icon: Briefcase, key: "employees" },
    { to: "/admin/overtime", icon: Timer, key: "overtime" },
    { to: "/admin/settings", icon: Settings, key: "settings" },
    { to: "/admin/leaves", icon: CalendarClock, key: "leaves" },
    { to: "/admin/reports", icon: BarChart3, key: "reports" },
    { to: "/admin/spp", icon: Wallet, key: "spp" },
    { to: "/admin/billing", icon: CreditCard, key: "billing" },
  ],
  teacher: [
    { to: "/guru", icon: ScanFace, key: "teacher_attendance", end: true },
    { to: "/guru/mapel", icon: BookOpen, key: "subject_att" },
    { to: "/guru/izin", icon: CalendarClock, key: "student_status_menu" },
    { to: "/guru/laporan", icon: BarChart3, key: "student_report_menu" },
  ],
  employee: [
    { to: "/karyawan", icon: ScanFace, key: "my_attendance", end: true },
  ],
};

const parentItems = [
  { tab: "", icon: GraduationCap, key: "child_activity" },
  { tab: "spp", icon: Wallet, key: "spp_bills_tab" },
  { tab: "leave", icon: CalendarClock, key: "nav_leave" },
  { tab: "profile", icon: User, key: "profile" },
];

const portalKey = { owner: "owner_portal", school_admin: "admin_portal", teacher: "teacher_portal", employee: "employee_portal", parent: "parent_portal" };

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const ptab = new URLSearchParams(location.search).get("tab") || "";
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const menuRef = useRef(null);
  const navRef = useRef(null);
  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (navRef.current && !navRef.current.contains(e.target)) setNavOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [pendingOvertime, setPendingOvertime] = useState(0);
  const [studentLeaveToday, setStudentLeaveToday] = useState(0);
  useEffect(() => {
    if (user?.role === "school_admin")
      api.get("/admin/stats").then((r) => {
        setPendingLeaves(r.data.pending_leaves || 0);
        setPendingOvertime(r.data.pending_overtime || 0);
      }).catch(() => {});
    if (user?.role === "teacher")
      api.get("/teacher/student-status").then((r) => {
        const today = new Date().toLocaleDateString("en-CA");
        setStudentLeaveToday((r.data || []).filter((x) => x.date === today).length);
      }).catch(() => {});
  }, [user?.role]);
  if (!user) return null;
  const items = menus[user.role] || [];
  const initials = (user.name || "?").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  const pendingMap = { leaves: pendingLeaves, overtime: pendingOvertime, student_status_menu: studentLeaveToday };
  const pendingTotal = pendingLeaves + pendingOvertime + studentLeaveToday;

  return (
    <div className="min-h-screen bg-slate-50">
      <header ref={navRef} className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {user.role !== "parent" && items.length > 0 && (
              <button data-testid="nav-hamburger" aria-label={t("nav_menu")} onClick={() => setNavOpen(!navOpen)}
                className="md:hidden relative flex items-center justify-center p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors shrink-0">
                {navOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                {pendingTotal > 0 && (
                  <span data-testid="nav-pending-badge"
                    className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center leading-none">{pendingTotal}</span>
                )}
              </button>
            )}
            <img src="/logo.png" alt="RadiusGate" className="w-9 h-9 object-contain shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-sm leading-tight truncate">{t("app_name")}</p>
              <p className="text-[11px] text-teal-700 font-medium leading-tight">{t(portalKey[user.role])} · {user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <button
              data-testid="kiosk-link-btn"
              onClick={() => nav("/kiosk")}
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-teal-700 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <MonitorSmartphone className="w-4 h-4" /> Kiosk
            </button>
            {user.role === "parent" ? (
              <div className="relative" ref={menuRef}>
                <button data-testid="user-menu-btn" onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-slate-100 transition-colors">
                  <span className="w-8 h-8 rounded-full bg-teal-700 text-white text-xs font-extrabold flex items-center justify-center shrink-0">{initials}</span>
                  <span className="hidden sm:block text-xs font-semibold text-slate-700 max-w-[140px] truncate">{user.name}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
                </button>
                {menuOpen && (
                  <div data-testid="user-menu" className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50">
                    <button data-testid="user-menu-profile" onClick={() => { setMenuOpen(false); nav("/ortu?tab=profile"); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-teal-700 transition-colors">
                      <User className="w-4 h-4" /> {t("profile")}
                    </button>
                    <div className="my-1 border-t border-slate-100" />
                    <button data-testid="user-menu-logout" onClick={() => { logout(); nav("/login"); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 transition-colors">
                      <LogOut className="w-4 h-4" /> {t("logout")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
            <button
              data-testid="logout-btn"
              onClick={() => { logout(); nav("/login"); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" /> {t("logout")}
            </button>
            )}
          </div>
        </div>
        {user.role !== "parent" && (
        <nav className="max-w-7xl mx-auto px-4 hidden md:flex gap-1 overflow-x-auto pb-2">
          {items.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.end}
              data-testid={`nav-${m.key}`}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <m.icon className="w-3.5 h-3.5" /> {t(m.key)}
            </NavLink>
          ))}
        </nav>
        )}
        {user.role !== "parent" && navOpen && (
          <nav data-testid="mobile-nav" className="md:hidden border-t border-slate-100 px-4 py-2 space-y-1">
            {items.map((m) => (
              <NavLink key={m.to} to={m.to} end={m.end} data-testid={`mnav-${m.key}`} onClick={() => setNavOpen(false)}
                className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${isActive ? "bg-teal-700 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
                <m.icon className="w-4 h-4" /> {t(m.key)}
                {(pendingMap[m.key] || 0) > 0 && (
                  <span data-testid={`mnav-${m.key}-badge`}
                    className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center leading-none">{pendingMap[m.key]}</span>
                )}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className={`max-w-7xl mx-auto px-4 py-6 ${user.role === "parent" ? "pb-24" : ""}`}>
        <Outlet />
      </main>
      {user.role === "parent" && (
        <nav data-testid="bottom-nav" className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex justify-center gap-1">
            {parentItems.map((m) => {
              const active = ptab === m.tab;
              return (
                <button
                  key={m.key}
                  data-testid={`nav-${m.key}`}
                  onClick={() => nav(m.tab ? `/ortu?tab=${m.tab}` : "/ortu")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    active ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <m.icon className="w-3.5 h-3.5" /> {t(m.key)}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export { homeFor };
