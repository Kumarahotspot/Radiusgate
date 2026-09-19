import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import { School, Users, GraduationCap, FileWarning, Plus, Trash2, Copy, Pencil, Link2 } from "lucide-react";
import { SCHOOL_TYPES, MAJOR_OPTIONS } from "../../schoolTemplates";

const rupiah = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function OwnerDashboard() {
  const { t } = useTranslation();
  const [ov, setOv] = useState(null);
  const [schools, setSchools] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", phone: "", admin_name: "", admin_email: "", admin_password: "", rate_per_student: 8000, student_count_manual: "", school_type: "", majors: [], majorOther: "" });
  const [busy, setBusy] = useState(false);
  const [editFor, setEditFor] = useState(null);

  const saveEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: editFor.name, address: editFor.address, phone: editFor.phone,
        admin_email: editFor.admin_email,
        rate_per_student: Number(editFor.rate_per_student),
        student_count_manual: editFor.student_count_manual === "" || editFor.student_count_manual == null ? null : Number(editFor.student_count_manual),
        school_type: editFor.school_type || "",
        majors: [...(editFor.majors || []), ...(editFor.majorOther || "").split(",").map((x) => x.trim()).filter(Boolean)],
      };
      if (editFor.new_password) payload.admin_password = editFor.new_password;
      await api.patch(`/owner/schools/${editFor.id}`, payload);
      toast.success(t("save"));
      setEditFor(null);
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const load = () => {
    api.get("/owner/overview").then((r) => setOv(r.data));
    api.get("/owner/schools").then((r) => setSchools(r.data));
  };
  useEffect(load, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const majors = [...form.majors, ...form.majorOther.split(",").map((s) => s.trim()).filter(Boolean)];
      await api.post("/owner/schools", {
        name: form.name, address: form.address, phone: form.phone,
        admin_name: form.admin_name, admin_email: form.admin_email, admin_password: form.admin_password,
        rate_per_student: Number(form.rate_per_student),
        student_count_manual: form.student_count_manual ? Number(form.student_count_manual) : null,
        school_type: form.school_type, majors,
      });
      toast.success(t("save"));
      setShowForm(false);
      setForm({ name: "", address: "", phone: "", admin_name: "", admin_email: "", admin_password: "", rate_per_student: 8000, student_count_manual: "", school_type: "", majors: [], majorOther: "" });
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const del = async (id) => {
    if (!window.confirm(t("confirm_delete"))) return;
    await api.delete(`/owner/schools/${id}`);
    load();
  };

  const stats = ov ? [
    { icon: School, label: t("total_schools"), val: ov.schools, testid: "stat-schools" },
    { icon: Users, label: t("total_teachers"), val: ov.teachers, testid: "stat-teachers" },
    { icon: GraduationCap, label: t("total_students"), val: ov.students, testid: "stat-students" },
    { icon: FileWarning, label: t("unpaid_invoices"), val: `${ov.unpaid_count} · ${rupiah(ov.unpaid_amount)}`, testid: "stat-unpaid" },
  ] : [];

  return (
    <div data-testid="owner-dashboard" className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.testid} data-testid={s.testid} className="bg-white rounded-2xl border border-slate-200 p-4">
            <s.icon className="w-5 h-5 text-teal-700 mb-2" />
            <p className="text-xl font-extrabold text-slate-800">{s.val}</p>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">{t("schools")}</h2>
        <button data-testid="create-school-btn" onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> {t("create_school")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} data-testid="create-school-form" className="bg-white rounded-2xl border border-slate-200 p-5 grid sm:grid-cols-2 gap-4">
          <Field label={t("school_name")} testid="school-name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
          <Field label={t("address")} testid="school-address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
          <Field label={t("phone")} testid="school-phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label={t("rate")} testid="school-rate" type="number" value={form.rate_per_student} onChange={(v) => setForm({ ...form, rate_per_student: v })} required />
          <Field label={t("student_count_manual")} testid="school-students-manual" type="number" value={form.student_count_manual} onChange={(v) => setForm({ ...form, student_count_manual: v })} />
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("school_type")}</label>
            <select data-testid="school-type" value={form.school_type}
              onChange={(e) => setForm({ ...form, school_type: e.target.value, majors: [] })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
              <option value="">—</option>
              {SCHOOL_TYPES.map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
          {(form.school_type === "SMA" || form.school_type === "SMK") && (
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-500">{t("majors")}</label>
              <p className="text-[11px] text-slate-400 mt-0.5">{t("majors_pick_hint")}</p>
              <div data-testid="school-majors" className="mt-1 max-h-32 overflow-y-auto rounded-xl border border-slate-200 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(MAJOR_OPTIONS[form.school_type] || []).map((m) => (
                  <label key={m} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" data-testid={`school-major-${m}`} checked={form.majors.includes(m)}
                      onChange={() => setForm({ ...form, majors: form.majors.includes(m) ? form.majors.filter((x) => x !== m) : [...form.majors, m] })}
                      className="accent-teal-700 w-4 h-4" />
                    {m}
                  </label>
                ))}
              </div>
              <input data-testid="school-major-other" value={form.majorOther} placeholder={t("majors_other")}
                onChange={(e) => setForm({ ...form, majorOther: e.target.value })}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
            </div>
          )}
          <div className="sm:col-span-2 border-t pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">{t("admin_account")}</p>
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label={t("admin_name")} testid="admin-name" value={form.admin_name} onChange={(v) => setForm({ ...form, admin_name: v })} required />
              <Field label={t("email")} testid="admin-email" type="email" value={form.admin_email} onChange={(v) => setForm({ ...form, admin_email: v })} required />
              <Field label={t("password")} testid="admin-password" value={form.admin_password} onChange={(v) => setForm({ ...form, admin_password: v })} required />
            </div>
          </div>
          <div className="sm:col-span-2 flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">{t("cancel")}</button>
            <button data-testid="school-submit" disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">{t("save")}</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-3">{t("school_name")}</th>
                <th className="px-4 py-3">{t("address")}</th>
                <th className="px-4 py-3">WA</th>
                <th className="px-4 py-3">{t("email")} Admin</th>
                <th className="px-4 py-3">{t("student_count")}</th>
                <th className="px-4 py-3">{t("teachers")}</th>
                <th className="px-4 py-3">{t("rate")}</th>
                <th className="px-4 py-3">{t("kiosk_code")}</th>
                <th className="px-4 py-3">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id} data-testid={`school-row-${s.kiosk_token}`} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-semibold text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-[180px] truncate">{s.address || "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.phone || "-"}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{s.admin_email}</td>
                  <td className="px-4 py-3">{s.student_count}{s.student_count_source === "manual" && <span className="text-[10px] text-slate-400 font-medium"> ({t("manual_badge")})</span>}</td>
                  <td className="px-4 py-3">{s.teacher_count}</td>
                  <td className="px-4 py-3">{rupiah(s.rate_per_student)}</td>
                  <td className="px-4 py-3">
                    <button data-testid={`copy-kiosk-${s.kiosk_token}`} onClick={() => { navigator.clipboard.writeText(s.kiosk_token); toast.success(s.kiosk_token); }}
                      className="inline-flex items-center gap-1 font-mono text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition-colors">
                      {s.kiosk_token} <Copy className="w-3 h-3" />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button data-testid={`login-link-${s.kiosk_token}`} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/login?email=${encodeURIComponent(s.admin_email)}`); toast.success(t("login_link_copied")); }}
                        className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg" title={t("login_link")}><Link2 className="w-4 h-4" /></button>
                      <button data-testid={`edit-school-${s.kiosk_token}`} onClick={() => setEditFor({ ...s, majorOther: "" })} className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg" title={t("edit")}><Pencil className="w-4 h-4" /></button>
                      <button data-testid={`delete-school-${s.kiosk_token}`} onClick={() => del(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title={t("delete")}><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {schools.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">{t("no_data")}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {editFor && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid="edit-school-modal">
          <form onSubmit={saveEdit} data-testid="edit-school-form" className="bg-white rounded-2xl w-full max-w-lg p-5 grid sm:grid-cols-2 gap-4">
            <p className="sm:col-span-2 font-bold text-slate-800">{t("edit_school")}</p>
            <Field label={t("school_name")} testid="edit-school-name" value={editFor.name} onChange={(v) => setEditFor({ ...editFor, name: v })} required />
            <Field label={t("rate")} testid="edit-school-rate" type="number" value={editFor.rate_per_student} onChange={(v) => setEditFor({ ...editFor, rate_per_student: v })} required />
            <div className="sm:col-span-2"><Field label={t("address")} testid="edit-school-address" value={editFor.address || ""} onChange={(v) => setEditFor({ ...editFor, address: v })} /></div>
            <Field label={`${t("email")} Admin`} testid="edit-school-email" type="email" value={editFor.admin_email || ""} onChange={(v) => setEditFor({ ...editFor, admin_email: v })} required />
            <Field label={t("phone")} testid="edit-school-phone" value={editFor.phone || ""} onChange={(v) => setEditFor({ ...editFor, phone: v })} />
            <Field label={t("student_count_manual")} testid="edit-school-students" type="number" value={editFor.student_count_manual ?? ""} onChange={(v) => setEditFor({ ...editFor, student_count_manual: v })} />
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("school_type")}</label>
              <select data-testid="edit-school-type" value={editFor.school_type || ""}
                onChange={(e) => setEditFor({ ...editFor, school_type: e.target.value, majors: [] })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
                <option value="">—</option>
                {SCHOOL_TYPES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            {(editFor.school_type === "SMA" || editFor.school_type === "SMK") && (
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-500">{t("majors")}</label>
                <p className="text-[11px] text-slate-400 mt-0.5">{t("majors_pick_hint")}</p>
                <div data-testid="edit-school-majors" className="mt-1 max-h-32 overflow-y-auto rounded-xl border border-slate-200 p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[...new Set([...(MAJOR_OPTIONS[editFor.school_type] || []), ...(editFor.majors || [])])].map((m) => (
                    <label key={m} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input type="checkbox" data-testid={`edit-school-major-${m}`} checked={(editFor.majors || []).includes(m)}
                        onChange={() => setEditFor({ ...editFor, majors: editFor.majors.includes(m) ? editFor.majors.filter((x) => x !== m) : [...(editFor.majors || []), m] })}
                        className="accent-teal-700 w-4 h-4" />
                      {m}
                    </label>
                  ))}
                </div>
                <input data-testid="edit-school-major-other" value={editFor.majorOther || ""} placeholder={t("majors_other")}
                  onChange={(e) => setEditFor({ ...editFor, majorOther: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-500">{t("password")} Admin</label>
              <input data-testid="edit-school-password" type="password" value={editFor.new_password || ""} placeholder={t("secret_keep")}
                onChange={(e) => setEditFor({ ...editFor, new_password: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition" />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" data-testid="edit-cancel" onClick={() => setEditFor(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">{t("cancel")}</button>
              <button data-testid="edit-submit" disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">{busy ? t("loading") : t("save")}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, testid }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      <input data-testid={testid} type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 transition" />
    </div>
  );
}
