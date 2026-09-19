import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "@/api";

const LEAD_STATUS = {
  new: "bg-sky-100 text-sky-700 border-sky-200",
  contacted: "bg-amber-100 text-amber-700 border-amber-200",
  onboarding: "bg-teal-100 text-teal-700 border-teal-200",
  rejected: "bg-red-100 text-red-600 border-red-200",
};

export default function OwnerLeads() {
  const { t } = useTranslation();
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    api.get("/owner/leads").then(({ data }) => setLeads(data)).catch((e) => toast.error(errMsg(e)));
  }, []);

  const setStatus = async (id, status) => {
    try {
      await api.patch(`/owner/leads/${id}`, { status });
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
      toast.success(t("updated_ok"));
    } catch (e) { toast.error(errMsg(e)); }
  };

  return (
    <div data-testid="owner-leads" className="space-y-6">
      <h2 className="text-lg font-bold text-slate-800">
        {t("leads")} <span data-testid="leads-total" className="text-teal-700">({leads.length})</span>
      </h2>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-3">{t("date")}</th>
                <th className="px-4 py-3">{t("schools")}</th>
                <th className="px-4 py-3">{t("contact_person")}</th>
                <th className="px-4 py-3">{t("email")}</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">{t("students")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("message")}</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} data-testid={`lead-row-${l.id}`} className="border-b last:border-0 hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{(l.created_at || "").slice(0, 10)}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-800">{l.school_name}</td>
                  <td className="px-4 py-2.5">{l.contact_person}</td>
                  <td className="px-4 py-2.5 text-xs">{l.email}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{l.phone || "-"}</td>
                  <td className="px-4 py-2.5">{l.student_count ?? "-"}</td>
                  <td className="px-4 py-2.5">
                    <select data-testid={`lead-status-${l.id}`} value={l.status || "new"} onChange={(e) => setStatus(l.id, e.target.value)}
                      className={`text-xs font-bold rounded-lg border px-2 py-1.5 outline-none cursor-pointer ${LEAD_STATUS[l.status || "new"]}`}>
                      {Object.keys(LEAD_STATUS).map((s) => <option key={s} value={s}>{t(`lead_status_${s}`)}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 max-w-xs truncate" title={l.message}>{l.message || "-"}</td>
                </tr>
              ))}
              {leads.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
