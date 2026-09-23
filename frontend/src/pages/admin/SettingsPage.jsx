import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import { MapPin, Plus, Trash2, Crosshair, Copy, Pencil, X, Check, QrCode } from "lucide-react";

const TEMPLATES = {
  SD: {
    classes: ["Kelas 1", "Kelas 2", "Kelas 3", "Kelas 4", "Kelas 5", "Kelas 6"],
    majors: [],
    subjects: ["PAI & Budi Pekerti", "Pendidikan Pancasila", "Bahasa Indonesia", "Matematika", "IPAS", "Seni Budaya & Prakarya", "PJOK", "Bahasa Inggris", "Muatan Lokal"],
  },
  SMP: {
    classes: ["Kelas 7", "Kelas 8", "Kelas 9"],
    majors: [],
    subjects: ["PAI & Budi Pekerti", "Pendidikan Pancasila", "Bahasa Indonesia", "Matematika", "IPA", "IPS", "Bahasa Inggris", "Seni Budaya", "Prakarya", "PJOK", "Informatika", "BK"],
  },
  SMA: {
    classes: ["Kelas X", "Kelas XI", "Kelas XII"],
    majors: ["IPA", "IPS", "Bahasa"],
    subjects: ["PAI & Budi Pekerti", "Pendidikan Pancasila", "Bahasa Indonesia", "Matematika", "Bahasa Inggris", "Fisika", "Kimia", "Biologi", "Sejarah", "Geografi", "Ekonomi", "Sosiologi", "Seni Budaya", "PJOK", "Informatika", "BK"],
  },
  SMK: {
    classes: ["Kelas X", "Kelas XI", "Kelas XII"],
    majors: ["TKJ", "RPL", "TKR", "TBSM", "AKL", "BDP"],
    subjects: ["PAI & Budi Pekerti", "Pendidikan Pancasila", "Bahasa Indonesia", "Matematika", "Bahasa Inggris", "IPAS", "Seni Budaya", "PJOK", "Informatika", "Produk Kreatif & Kewirausahaan", "Mapel Produktif Jurusan", "BK"],
  },
};

export default function SettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({ work_start: "07:00", work_end: "15:00", late_tolerance_min: 10, early_checkin_min: 60, timezone: "Asia/Jakarta", require_checkin: true });
  const [locations, setLocations] = useState([]);
  const [school, setSchool] = useState(null);
  const [loc, setLoc] = useState({ name: "", lat: "", lng: "", radius_m: 50 });
  const [masterClasses, setMasterClasses] = useState([]);
  const [masterSubjects, setMasterSubjects] = useState([]);
  const [masterMajors, setMasterMajors] = useState([]);
  const [masterDepartments, setMasterDepartments] = useState([]);

  const loadMaster = () => api.get("/admin/meta/options").then((r) => {
    setMasterClasses(r.data.classes || []);
    setMasterSubjects(r.data.subjects || []);
    setMasterMajors(r.data.majors || []);
    setMasterDepartments(r.data.departments || []);
  });

  const load = () => api.get("/admin/settings").then((r) => {
    if (r.data.settings) setSettings(r.data.settings);
    setLocations(r.data.locations || []);
    setSchool(r.data.school);
  });
  useEffect(() => { load(); loadMaster(); }, []);

  const saveList = async (key, list) => {
    try {
      await api.put("/admin/settings", { [key]: list });
      loadMaster();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const LIST_STATE = { class: [masterClasses, "class_list"], subject: [masterSubjects, "subject_list"], major: [masterMajors, "major_list"], department: [masterDepartments, "department_list"] };

  const addItem = (kind, v) => {
    const [list, key] = LIST_STATE[kind];
    if (list.includes(v)) return;
    saveList(key, [...list, v].sort());
  };

  const deleteItem = async (kind, v) => {
    try {
      await api.post("/admin/meta/delete", { kind, value: v });
      loadMaster();
    } catch (err) {
      const d = err.response?.data?.detail || "";
      if (d.startsWith("class_in_use")) toast.error(t("class_in_use", { count: d.split(":")[1] }));
      else if (d === "subject_in_use") toast.error(t("subject_in_use"));
      else if (d.startsWith("department_in_use")) toast.error(t("department_in_use", { count: d.split(":")[1] }));
      else toast.error(errMsg(err));
    }
  };

  const renameItem = async (kind, fromV, toV) => {
    if (!toV || toV === fromV) return;
    try {
      await api.post("/admin/meta/rename", { kind, from_value: fromV, to_value: toV });
      toast.success(t("save"));
      loadMaster();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const applyTemplate = async () => {
    const tp = TEMPLATES[settings.school_type];
    if (!tp) return;
    if (!window.confirm(t("template_confirm", { type: settings.school_type }))) return;
    try {
      await api.put("/admin/settings", {
        class_list: [...new Set([...masterClasses, ...tp.classes])].sort(),
        subject_list: [...new Set([...masterSubjects, ...tp.subjects])].sort(),
        major_list: [...new Set([...masterMajors, ...tp.majors])].sort(),
      });
      toast.success(t("save"));
      loadMaster();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...settings, late_tolerance_min: Number(settings.late_tolerance_min), early_checkin_min: Number(settings.early_checkin_min ?? 60) };
      if (settings.overtime_rate === "" || settings.overtime_rate == null) delete payload.overtime_rate;
      else payload.overtime_rate = Number(settings.overtime_rate);
      await api.put("/admin/settings", payload);
      toast.success(t("save"));
    } catch (err) { toast.error(errMsg(err)); }
  };

  const addLoc = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/locations", { ...loc, lat: Number(loc.lat), lng: Number(loc.lng), radius_m: Number(loc.radius_m) });
      toast.success(t("save"));
      setLoc({ name: "", lat: "", lng: "", radius_m: 50 });
      load();
    } catch (err) { toast.error(errMsg(err)); }
  };

  const myLoc = () => {
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ ...loc, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) }),
      () => toast.error(t("kiosk_gps_error")),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const delLoc = async (id) => {
    if (!window.confirm(t("confirm_delete"))) return;
    await api.delete(`/admin/locations/${id}`);
    load();
  };

  const downloadPoster = async () => {
    try {
      const res = await api.get("/admin/kiosk-poster", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `poster-kiosk-${school.kiosk_token}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(errMsg(err)); }
  };

  return (
    <div data-testid="settings-page" className="space-y-6">
      {school && (
        <div className="bg-teal-800 text-white rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-teal-200">{t("kiosk_code")}</p>
            <p data-testid="kiosk-token" className="font-mono font-bold text-lg">{school.kiosk_token}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button data-testid="copy-kiosk-btn" onClick={() => { navigator.clipboard.writeText(school.kiosk_token); toast.success(school.kiosk_token); }}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold transition-colors">
              <Copy className="w-4 h-4" /> {t("kiosk_code")}
            </button>
            <button data-testid="poster-kiosk-btn" onClick={downloadPoster}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold transition-colors">
              <QrCode className="w-4 h-4" /> {t("kiosk_poster")}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={saveSettings} data-testid="saver-board-form" className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div>
          <p className="font-bold text-slate-800 text-sm">{t("saver_board")}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t("saver_board_hint")}</p>
        </div>
        {(settings.saver_notes || []).map((n, i) => (
          <div key={i} data-testid={`saver-note-${i}`} className="flex flex-wrap items-start gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3">
            <input value={n.title} placeholder={t("note_title")} data-testid={`saver-note-title-${i}`}
              onChange={(e) => { const arr = [...settings.saver_notes]; arr[i] = { ...arr[i], title: e.target.value }; setSettings({ ...settings, saver_notes: arr }); }}
              className="flex-1 min-w-[160px] rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
            <input value={n.body} placeholder={t("note_body")} data-testid={`saver-note-body-${i}`}
              onChange={(e) => { const arr = [...settings.saver_notes]; arr[i] = { ...arr[i], body: e.target.value }; setSettings({ ...settings, saver_notes: arr }); }}
              className="flex-[2] min-w-[200px] rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
            <button type="button" data-testid={`saver-note-del-${i}`}
              onClick={() => setSettings({ ...settings, saver_notes: settings.saver_notes.filter((_, j) => j !== i) })}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        <div className="flex gap-2">
          <button type="button" data-testid="saver-note-add"
            onClick={() => setSettings({ ...settings, saver_notes: [...(settings.saver_notes || []), { title: "", body: "" }] })}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors">
            <Plus className="w-4 h-4" /> {t("add_note")}
          </button>
          <button data-testid="saver-board-save"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-colors">{t("save")}</button>
        </div>
      </form>

      <form onSubmit={saveSettings} data-testid="work-hours-form" className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="font-bold text-slate-800 mb-4">{t("work_hours")}</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 max-w-3xl">
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("work_start")}</label>
            <input data-testid="work-start" type="time" value={settings.work_start} onChange={(e) => setSettings({ ...settings, work_start: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("work_end")}</label>
            <input data-testid="work-end" type="time" value={settings.work_end} onChange={(e) => setSettings({ ...settings, work_end: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("tolerance")}</label>
            <input data-testid="work-tolerance" type="number" value={settings.late_tolerance_min} onChange={(e) => setSettings({ ...settings, late_tolerance_min: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("early_window")}</label>
            <input data-testid="work-early" type="number" value={settings.early_checkin_min ?? 60} onChange={(e) => setSettings({ ...settings, early_checkin_min: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("timezone")}</label>
            <select data-testid="work-timezone" value={settings.timezone || "Asia/Jakarta"} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
              <option value="Asia/Jakarta">WIB (Jakarta)</option>
              <option value="Asia/Makassar">WITA (Makassar)</option>
              <option value="Asia/Jayapura">WIT (Jayapura)</option>
            </select>
          </div>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700 max-w-3xl">
          <input data-testid="require-checkin-toggle" type="checkbox" checked={settings.require_checkin !== false}
            onChange={(e) => setSettings({ ...settings, require_checkin: e.target.checked })}
            className="accent-teal-700 w-4 h-4" />
          <span>{t("require_checkin")} <span className="text-xs text-slate-400">({t("require_checkin_hint")})</span></span>
        </label>
        <div className="mt-3 max-w-xs">
          <label className="text-xs font-semibold text-slate-500">{t("default_overtime_rate")}</label>
          <input data-testid="default-overtime-rate" type="number" min={0} value={settings.overtime_rate ?? ""}
            onChange={(e) => setSettings({ ...settings, overtime_rate: e.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("greeting_in_setting")}</label>
            <input data-testid="greeting-in" value={settings.greeting_in || ""} placeholder={t("kiosk_welcome")} onChange={(e) => setSettings({ ...settings, greeting_in: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("greeting_out_setting")}</label>
            <input data-testid="greeting-out" value={settings.greeting_out || ""} placeholder={t("kiosk_goodbye")} onChange={(e) => setSettings({ ...settings, greeting_out: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400 max-w-3xl">{t("greeting_hint")}</p>
        <button data-testid="save-settings-btn" className="mt-4 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800">{t("save")}</button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 p-5" data-testid="master-data-card">
        <p className="font-bold text-slate-800 mb-1">{t("master_data")}</p>
        <p className="text-xs text-slate-400 mb-4">{t("master_hint")}</p>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("school_type")}</label>
            <select data-testid="school-type" value={settings.school_type || ""}
              onChange={(e) => { const v = e.target.value; setSettings({ ...settings, school_type: v }); api.put("/admin/settings", { school_type: v || "" }).then(loadMaster).catch((err) => toast.error(errMsg(err))); }}
              className="mt-1 w-full sm:w-40 rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white outline-none focus:border-teal-600">
              <option value="">—</option>
              <option value="SD">SD</option>
              <option value="SMP">SMP</option>
              <option value="SMA">SMA</option>
              <option value="SMK">SMK</option>
            </select>
          </div>
          {settings.school_type && (
            <button type="button" data-testid="apply-template-btn" onClick={applyTemplate}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors">
              {t("use_template", { type: settings.school_type })}
            </button>
          )}
        </div>
        <div className={`grid gap-4 ${["SMA", "SMK"].includes(settings.school_type) ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <MasterList title={t("master_classes")} testid="master-class" items={masterClasses}
            onAdd={(v) => addItem("class", v)} onDelete={(v) => deleteItem("class", v)} onRename={(f2, t2) => renameItem("class", f2, t2)} t={t} />
          {["SMA", "SMK"].includes(settings.school_type) && (
            <MasterList title={t("majors")} testid="master-major" items={masterMajors}
              onAdd={(v) => addItem("major", v)} onDelete={(v) => deleteItem("major", v)} onRename={(f2, t2) => renameItem("major", f2, t2)} t={t} />
          )}
          <MasterList title={t("master_subjects")} testid="master-subject" items={masterSubjects}
            onAdd={(v) => addItem("subject", v)} onDelete={(v) => deleteItem("subject", v)} onRename={(f2, t2) => renameItem("subject", f2, t2)} t={t} />
          <MasterList title={t("department_list")} testid="master-department" items={masterDepartments}
            onAdd={(v) => addItem("department", v)} onDelete={(v) => deleteItem("department", v)} onRename={(f2, t2) => renameItem("department", f2, t2)} t={t} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="font-bold text-slate-800 mb-4">{t("locations")}</p>
        <form onSubmit={addLoc} data-testid="add-location-form" className="grid sm:grid-cols-5 gap-3 items-end mb-5">
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("name")}</label>
            <input data-testid="loc-name" required value={loc.name} onChange={(e) => setLoc({ ...loc, name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("latitude")}</label>
            <input data-testid="loc-lat" required value={loc.lat} onChange={(e) => setLoc({ ...loc, lat: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("longitude")}</label>
            <input data-testid="loc-lng" required value={loc.lng} onChange={(e) => setLoc({ ...loc, lng: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">{t("radius")}</label>
            <input data-testid="loc-radius" type="number" required value={loc.radius_m} onChange={(e) => setLoc({ ...loc, radius_m: e.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-600" />
          </div>
          <div className="flex gap-2">
            <button type="button" data-testid="loc-myloc-btn" onClick={myLoc} className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600" title={t("use_my_location")}><Crosshair className="w-4 h-4" /></button>
            <button data-testid="loc-submit" className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800"><Plus className="w-4 h-4" /> {t("add")}</button>
          </div>
        </form>
        <div className="space-y-2">
          {locations.map((l) => (
            <div key={l.id} data-testid={`location-row-${l.id}`} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-teal-700" />
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{l.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{l.lat}, {l.lng} · r={l.radius_m}m</p>
                </div>
              </div>
              <button data-testid={`delete-location-${l.id}`} onClick={() => delLoc(l.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          {locations.length === 0 && <p className="text-slate-400 text-sm text-center py-4">{t("no_data")}</p>}
        </div>
      </div>
    </div>
  );
}

function MasterList({ title, testid, items, onAdd, onDelete, onRename, t }) {
  const [val, setVal] = useState("");
  const [renaming, setRenaming] = useState(null);
  const [renameVal, setRenameVal] = useState("");
  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <p className="text-sm font-bold text-slate-700 mb-2">{title}</p>
      <div className="flex flex-wrap gap-2" data-testid={`${testid}-list`}>
        {items.map((it) => (
          <span key={it} className="inline-flex items-center gap-1.5 bg-slate-100 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700">
            {renaming === it ? (
              <>
                <input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} data-testid={`${testid}-rename-input`}
                  className="w-24 bg-white border border-teal-300 rounded px-1.5 py-0.5 text-xs outline-none" />
                <button type="button" data-testid={`${testid}-rename-save`} onClick={() => { onRename(it, renameVal.trim()); setRenaming(null); }}
                  className="text-teal-700 hover:text-teal-900"><Check className="w-3.5 h-3.5" /></button>
                <button type="button" onClick={() => setRenaming(null)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
              </>
            ) : (
              <>
                {it}
                <button type="button" data-testid={`${testid}-rename-${it}`} onClick={() => { setRenaming(it); setRenameVal(it); }}
                  className="text-sky-600 hover:text-sky-800"><Pencil className="w-3 h-3" /></button>
                <button type="button" data-testid={`${testid}-delete-${it}`} onClick={() => onDelete(it)}
                  className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
              </>
            )}
          </span>
        ))}
        {items.length === 0 && <p className="text-xs text-slate-400">{t("no_data")}</p>}
      </div>
      <div className="mt-3 flex gap-2">
        <input value={val} onChange={(e) => setVal(e.target.value)} placeholder={title} data-testid={`${testid}-add-input`}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-600" />
        <button type="button" data-testid={`${testid}-add-btn`} onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(""); } }}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-colors">{t("add")}</button>
      </div>
    </div>
  );
}
