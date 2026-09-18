import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import { Check, X } from "lucide-react";

export default function Leaves() {
  const { t } = useTranslation();
  const [leaves, setLeaves] = useState([]);

  const load = () => api.get("/admin/leaves").then((r) => setLeaves(r.data));
  useEffect(() => { load(); }, []);

  const decide = async (id, status) => {
    try {
      await api.post(`/admin/leaves/${id}/decision`, { status });
      toast.success(t(status));
      load();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const badge = (s) => s === "approved" ? "bg-emerald-100 text-emerald-700" : s === "rejected" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700";

  return (
    <div data-testid="leaves-page" className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">{t("leaves")}</h2>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-3">{t("name")}</th>
                <th className="px-4 py-3">{t("type")}</th>
                <th className="px-4 py-3">{t("from")}</th>
                <th className="px-4 py-3">{t("to")}</th>
                <th className="px-4 py-3">{t("reason")}</th>
                <th className="px-4 py-3">{t("status")}</th>
                <th className="px-4 py-3">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((l) => (
                <tr key={l.id} data-testid={`leave-row-${l.id}`} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-semibold text-slate-800">{l.teacher_name}</td>
                  <td className="px-4 py-3">{t(l.type)}</td>
                  <td className="px-4 py-3">{l.date_from}</td>
                  <td className="px-4 py-3">{l.date_to}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate">{l.reason}</td>
                  <td className="px-4 py-3"><span data-testid={`leave-status-${l.id}`} className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge(l.status)}`}>{t(l.status)}</span></td>
                  <td className="px-4 py-3">
                    {l.status === "pending" && (
                      <div className="flex gap-1">
                        <button data-testid={`leave-approve-${l.id}`} onClick={() => decide(l.id, "approved")} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Check className="w-4 h-4" /></button>
                        <button data-testid={`leave-reject-${l.id}`} onClick={() => decide(l.id, "rejected")} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><X className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {leaves.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
