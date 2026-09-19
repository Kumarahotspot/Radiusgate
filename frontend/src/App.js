import "@/App.css";
import "@/i18n";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth, homeFor } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Landing from "@/pages/Landing";
import Kiosk from "@/pages/Kiosk";
import Pay from "@/pages/Pay";
import OwnerDashboard from "@/pages/owner/OwnerDashboard";
import OwnerInvoices from "@/pages/owner/OwnerInvoices";
import OwnerLeads from "@/pages/owner/OwnerLeads";
import NotifSettings from "@/pages/owner/NotifSettings";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import Teachers from "@/pages/admin/Teachers";
import Students from "@/pages/admin/Students";
import SettingsPage from "@/pages/admin/SettingsPage";
import Leaves from "@/pages/admin/Leaves";
import Reports from "@/pages/admin/Reports";
import Billing from "@/pages/admin/Billing";
import TeacherHome from "@/pages/teacher/TeacherHome";

function Guard({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster richColors position="top-center" />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/kiosk" element={<Kiosk />} />
          <Route path="/pay/:token" element={<Pay />} />
          <Route element={<Guard roles={["owner"]}><Layout /></Guard>}>
            <Route path="/owner" element={<OwnerDashboard />} />
            <Route path="/owner/leads" element={<OwnerLeads />} />
            <Route path="/owner/invoices" element={<OwnerInvoices />} />
            <Route path="/owner/settings" element={<NotifSettings />} />
          </Route>
          <Route element={<Guard roles={["school_admin"]}><Layout /></Guard>}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/teachers" element={<Teachers />} />
            <Route path="/admin/students" element={<Students />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
            <Route path="/admin/leaves" element={<Leaves />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/billing" element={<Billing />} />
          </Route>
          <Route element={<Guard roles={["teacher"]}><Layout /></Guard>}>
            <Route path="/guru" element={<TeacherHome />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
