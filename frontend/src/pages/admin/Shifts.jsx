import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import { Plus, Pencil, Trash2 } from "lucide-react";

const EMPTY = { name: "", start: "07:00", end: "15:00" };

export default function Shifts() {
  const { t } = useTranslation();
  const [shifts, setShifts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editFor, setEditFor] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/admin/shifts").then((r) => setShifts(r.data));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/admin/shifts", form);
      toast.success(t("save"));
      setForm(EMPTY);
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch(`/admin/shifts/${editFor.id}`, { name: editFor.name, start: editFor.start, end: editFor.end });
      toast.success(t("save"));
      setEditFor(null);
      load();
    } catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  const del = async (id) => {
    if (!window.confirm(t("confirm_delete"))) return;
    await api.delete(`/admin/shifts/${id}`);
    load();
  };

  const In = ({ label, k, type = "text", testid, obj, setter }) => (
    <div>
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      <input data-testid={testid} type={type} required value={obj[k]}
        onChange={(e) => setter({ ...obj, [k]: e.target.value })}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
    </div>
  );

  return (
    <div data-testid="shifts-page" className="space-y-4">
      <h2 className="text-lg font-bold text-slate-800">{t("shifts_menu")}</h2>
      <p className="text-xs text-slate-500 max-w-2xl">{t("shift_hint")}</p>

      <form onSubmit={create} data-testid="add-shift-form" className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-3">
        <In label={t("shift_name")} k="name" testid="shift-name" obj={form} setter={setForm} />
        <In label={t("shift_start")} k="start" type="time" testid="shift-start" obj={form} setter={setForm} />
        <In label={t("shift_end")} k="end" type="time" testid="shift-end" obj={form} setter={setForm} />
        <button data-testid="shift-submit" disabled={busy}
          className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50">
          <Plus className="w-4 h-4" /> {t("add_shift")}
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b bg-slate-50">
              <th className="px-4 py-3">{t("shift_name")}</th>
              <th className="px-4 py-3">{t("shift_start")}</th>
              <th className="px-4 py-3">{t("shift_end")}</th>
              <th className="px-4 py-3">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id} data-testid={`shift-row-${s.id}`} className="border-b last:border-0 hover:bg-slate-50/60">
                <td className="px-4 py-2.5 font-semibold text-slate-800">{s.name}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{s.start}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{s.end}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <button data-testid={`edit-shift-${s.id}`} onClick={() => setEditFor({ ...s })}
                      className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:bg-sky-50 px-2 py-1.5 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" /> {t("edit")}
                    </button>
                    <button data-testid={`delete-shift-${s.id}`} onClick={() => del(s.id)}
                      className="flex items-center gap-1 text-xs font-bold text-red-500 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" /> {t("delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {shifts.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{t("no_shifts")}</td></tr>}
          </tbody>
        </table>
      </div>

      {editFor && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" data-testid="edit-shift-modal">
          <form onSubmit={saveEdit} className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
            <p className="font-bold text-slate-800">{t("edit")} {t("shifts_menu")}</p>
            <In label={t("shift_name")} k="name" testid="edit-shift-name" obj={editFor} setter={setEditFor} />
            <div className="grid grid-cols-2 gap-3">
              <In label={t("shift_start")} k="start" type="time" testid="edit-shift-start" obj={editFor} setter={setEditFor} />
              <In label={t("shift_end")} k="end" type="time" testid="edit-shift-end" obj={editFor} setter={setEditFor} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditFor(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">{t("cancel")}</button>
              <button data-testid="edit-shift-submit" disabled={busy} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50">{t("save")}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
