import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { errMsg } from "../../api";
import { MapPin, Plus, Trash2, Crosshair, Copy } from "lucide-react";

export default function SettingsPage() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({ work_start: "07:00", work_end: "15:00", late_tolerance_min: 10, early_checkin_min: 60 });
  const [locations, setLocations] = useState([]);
  const [school, setSchool] = useState(null);
  const [loc, setLoc] = useState({ name: "", lat: "", lng: "", radius_m: 50 });

  const load = () => api.get("/admin/settings").then((r) => {
    if (r.data.settings) setSettings(r.data.settings);
    setLocations(r.data.locations || []);
    setSchool(r.data.school);
  });
  useEffect(() => { load(); }, []);

  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.put("/admin/settings", { ...settings, late_tolerance_min: Number(settings.late_tolerance_min), early_checkin_min: Number(settings.early_checkin_min ?? 60) });
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

  return (
    <div data-testid="settings-page" className="space-y-6">
      {school && (
        <div className="bg-teal-800 text-white rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-teal-200">{t("kiosk_code")}</p>
            <p data-testid="kiosk-token" className="font-mono font-bold text-lg">{school.kiosk_token}</p>
          </div>
          <button data-testid="copy-kiosk-btn" onClick={() => { navigator.clipboard.writeText(school.kiosk_token); toast.success(school.kiosk_token); }}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-xs font-bold transition-colors">
            <Copy className="w-4 h-4" /> {t("kiosk_code")}
          </button>
        </div>
      )}

      <form onSubmit={saveSettings} data-testid="work-hours-form" className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="font-bold text-slate-800 mb-4">{t("work_hours")}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
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
        </div>
        <button data-testid="save-settings-btn" className="mt-4 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-teal-700 hover:bg-teal-800">{t("save")}</button>
      </form>

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
