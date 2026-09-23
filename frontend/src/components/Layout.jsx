import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth, homeFor } from "../context/AuthContext";
import LangSwitch from "./LangSwitch";
import {
  LayoutDashboard, School, FileText, Users, GraduationCap, Settings,
  CalendarClock, BarChart3, CreditCard, LogOut, ScanFace, MonitorSmartphone, Bell, Inbox,
  Briefcase, Timer, Wallet, BookOpen, User, ChevronDown,
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
  parent: [
    { to: "/ortu", icon: GraduationCap, key: "child_activity", end: true },
  ],
};

const portalKey = { owner: "owner_portal", school_admin: "admin_portal", teacher: "teacher_portal", employee: "employee_portal", parent: "parent_portal" };

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  if (!user) return null;
  const items = menus[user.role] || [];
  const initials = (user.name || "?").split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/logo.png" alt="RadiusGate" className="w-11 h-11 object-contain shrink-0" />
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
        )}
      </header>
      <main className={`max-w-7xl mx-auto px-4 py-6 ${user.role === "parent" ? "pb-24" : ""}`}>
        <Outlet />
      </main>
      {user.role === "parent" && (
        <nav data-testid="bottom-nav" className="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex justify-center gap-1">
            {items.map((m) => (
              <NavLink
                key={m.to}
                to={m.to}
                end={m.end}
                data-testid={`nav-${m.key}`}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                <m.icon className="w-3.5 h-3.5" /> {t(m.key)}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

export { homeFor };
