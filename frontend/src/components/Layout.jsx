import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth, homeFor } from "../context/AuthContext";
import LangSwitch from "./LangSwitch";
import {
  LayoutDashboard, School, FileText, Users, GraduationCap, Settings,
  CalendarClock, BarChart3, CreditCard, LogOut, ScanFace, MonitorSmartphone, Bell, Inbox,
  Briefcase, Timer, Wallet,
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
    { to: "/guru/izin", icon: CalendarClock, key: "student_status_menu" },
    { to: "/guru/laporan", icon: BarChart3, key: "student_report_menu" },
  ],
  employee: [
    { to: "/karyawan", icon: ScanFace, key: "my_attendance", end: true },
  ],
  parent: [
    { to: "/ortu", icon: GraduationCap, key: "child_activity", end: true },
  ],
};

const portalKey = { owner: "owner_portal", school_admin: "admin_portal", teacher: "teacher_portal", employee: "employee_portal", parent: "parent_portal" };

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  if (!user) return null;
  const items = menus[user.role] || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden p-0.5">
              <img src="/logo.png" alt="EduGateID" className="w-full h-full object-contain" />
            </div>
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
            <button
              data-testid="logout-btn"
              onClick={() => { logout(); nav("/login"); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" /> {t("logout")}
            </button>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto pb-2">
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
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

export { homeFor };
