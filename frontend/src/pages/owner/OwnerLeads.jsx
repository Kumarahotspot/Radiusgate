import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "@/api";
import { School } from "lucide-react";
import { SCHOOL_TYPES, MAJOR_OPTIONS } from "@/schoolTemplates";

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

  const [convertFor, setConvertFor] = useState(null);
  const [busy, setBusy] = useState(false);

  const openConvert = (l) => setConvertFor({
    name: l.school_name, address: "", phone: l.phone || "",
    admin_name: l.contact_person, admin_email: l.email, admin_password: "",
    rate_per_student: 8000, student_count_manual: l.student_count ?? "",
    school_type: l.school_type || "", majors: l.majors || [], majorOther: "",
  });

  const convert = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const majors = [...convertFor.majors, ...(convertFor.majorOther || "").split(",").map((s) => s.trim()).filter(Boolean)];
      await api.post("/owner/schools", {
        name: convertFor.name, address: convertFor.address, phone: convertFor.phone,
        admin_name: convertFor.admin_name, admin_email: convertFor.admin_email, admin_password: convertFor.admin_password,
        rate_per_student: Number(convertFor.rate_per_student),
        student_count_manual: convertFor.student_count_manual ? Number(convertFor.student_count_manual) : null,
        school_type: convertFor.school_type, majors,
      });
      toast.success(t("updated_ok"));
      setConvertFor(null);
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
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
                <th className="px-4 py-3">{t("actions")}</th>
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
                  <td className="px-4 py-2.5">
                    {(l.status || "new") === "onboarding" && (
                      <button data-testid={`convert-lead-${l.id}`} onClick={() => openConvert(l)}
                        className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                        <School className="w-3.5 h-3.5" /> {t("convert_to_school")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {leads.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {convertFor && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid="convert-modal">
          <form onSubmit={convert} data-testid="convert-school-form" className="bg-white rounded-2xl w-full max-w-lg p-5 grid sm:grid-cols-2 gap-4">
            <p className="sm:col-span-2 font-bold text-slate-800">{t("convert_to_school")}</p>
            <CField label={t("school_name")} testid="convert-school-name" value={convertFor.name} onChange={(v) => setConvertFor({ ...convertFor, name: v })} required />
            <CField label={t("phone")} testid="convert-school-phone" value={convertFor.phone} onChange={(v) => setConvertFor({ ...convertFor, phone: v })} />
            <div className="sm:col-span-2"><CField label={t("address")} testid="convert-school-address" value={convertFor.address} onChange={(v) => setConvertFor({ ...convertFor, address: v })} /></div>
            <CField label={t("rate")} testid="convert-school-rate" type="number" value={convertFor.rate_per_student} onChange={(v) => setConvertFor({ ...convertFor, rate_per_student: v })} required />
            <CField label={t("student_count_manual")} testid="convert-school-students" type="number" value={convertFor.student_count_manual} onChange={(v) => setConvertFor({ ...convertFor, student_count_manual: v })} />
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("school_type")}</label>
              <select data-testid="convert-school-type" value={convertFor.school_type}
                onChange={(e) => setConvertFor({ ...convertFor, school_type: e.target.value, majors: [] })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
                <option value="">—</option>
                {SCHOOL_TYPES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            {(convertFor.school_type === "SMA" || convertFor.school_type === "SMK") && (
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-500">{t("majors")}</label>
                <p className="text-[11px] text-slate-400 mt-0.5">{t("majors_pick_hint")}</p>
                <div data-testid="convert-majors" className="mt-1 max-h-32 overflow-y-auto rounded-xl border border-slate-200 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[...new Set([...(MAJOR_OPTIONS[convertFor.school_type] || []), ...convertFor.majors])].map((m) => (
                    <label key={m} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input type="checkbox" data-testid={`convert-major-${m}`} checked={convertFor.majors.includes(m)}
                        onChange={() => setConvertFor({ ...convertFor, majors: convertFor.majors.includes(m) ? convertFor.majors.filter((x) => x !== m) : [...convertFor.majors, m] })}
                        className="accent-teal-700 w-4 h-4" />
                      {m}
                    </label>
                  ))}
                </div>
                <input data-testid="convert-major-other" value={convertFor.majorOther} placeholder={t("majors_other")}
                  onChange={(e) => setConvertFor({ ...convertFor, majorOther: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
              </div>
            )}
            <div className="sm:col-span-2 border-t pt-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">{t("admin_account")}</p>
              <div className="grid sm:grid-cols-3 gap-4">
                <CField label={t("admin_name")} testid="convert-admin-name" value={convertFor.admin_name} onChange={(v) => setConvertFor({ ...convertFor, admin_name: v })} required />
                <CField label={t("email")} testid="convert-admin-email" type="email" value={convertFor.admin_email} onChange={(v) => setConvertFor({ ...convertFor, admin_email: v })} required />
                <CField label={t("password")} testid="convert-admin-password" type="password" value={convertFor.admin_password} onChange={(v) => setConvertFor({ ...convertFor, admin_password: v })} required />
              </div>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" data-testid="convert-cancel" onClick={() => setConvertFor(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">{t("cancel")}</button>
              <button data-testid="convert-submit" disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">{busy ? t("loading") : t("save")}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function CField({ label, value, onChange, type = "text", required, testid }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      <input data-testid={testid} type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition" />
    </div>
  );
}
