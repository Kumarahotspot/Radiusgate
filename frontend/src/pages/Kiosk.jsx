import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import LangSwitch from "../components/LangSwitch";
import { captureFrame, startCamera } from "../components/CameraCapture";
import { ScanFace, Volume2, VolumeX, WifiOff, LogIn, LogOut, Unplug } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const Q_KEY = "kiosk_queue";
const T_KEY = "kiosk_token";

const loadQueue = () => JSON.parse(localStorage.getItem(Q_KEY) || "[]");
const saveQueue = (q) => localStorage.setItem(Q_KEY, JSON.stringify(q));

const localIso = () => new Date().toISOString();

export default function Kiosk() {
  const { t, i18n } = useTranslation();
  const [token, setToken] = useState(localStorage.getItem(T_KEY) || "");
  const [codeInput, setCodeInput] = useState("");
  const [info, setInfo] = useState(null);
  const [pairError, setPairError] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | liveness | gps | sending | result
  const [result, setResult] = useState(null); // {ok, message, name}
  const [attType, setAttType] = useState("in");
  const [nisInput, setNisInput] = useState("");
  const [muted, setMuted] = useState(localStorage.getItem("kiosk_mute") === "1");
  const [queue, setQueue] = useState(loadQueue());
  const [online, setOnline] = useState(navigator.onLine);
  const [offlinePick, setOfflinePick] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const busyRef = useRef(false);

  const speak = useCallback((text) => {
    if (muted || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = i18n.language === "en" ? "en-US" : "id-ID";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, [muted, i18n.language]);

  const loadInfo = useCallback(async (tk) => {
    try {
      const { data } = await axios.get(`${API}/kiosk/info`, { headers: { "X-Kiosk-Token": tk } });
      setInfo(data);
      localStorage.setItem("kiosk_info", JSON.stringify(data));
      const tch = await axios.get(`${API}/kiosk/teachers`, { headers: { "X-Kiosk-Token": tk } });
      setTeachers(tch.data);
      localStorage.setItem("kiosk_teachers", JSON.stringify(tch.data));
      return true;
    } catch {
      const cached = localStorage.getItem("kiosk_info");
      if (cached) {
        setInfo(JSON.parse(cached));
        setTeachers(JSON.parse(localStorage.getItem("kiosk_teachers") || "[]"));
        return true;
      }
      return false;
    }
  }, []);

  useEffect(() => {
    if (token) loadInfo(token).then((ok) => { if (!ok) { setToken(""); localStorage.removeItem(T_KEY); } });
  }, [token, loadInfo]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // camera
  useEffect(() => {
    if (!token || !info) return;
    startCamera(videoRef, streamRef, (key) => setResult({ ok: false, message: t(key) }));
    return () => streamRef.current?.getTracks().forEach((tr) => tr.stop());
  }, [token, info, t]);

  // auto sync
  useEffect(() => {
    const sync = async () => {
      const q = loadQueue();
      if (!q.length || !navigator.onLine || !token) return;
      try {
        await axios.post(`${API}/kiosk/sync`, { records: q }, { headers: { "X-Kiosk-Token": token } });
        saveQueue([]);
        setQueue([]);
      } catch { /* retry later */ }
    };
    sync();
    const iv = setInterval(sync, 15000);
    return () => clearInterval(iv);
  }, [token, online]);

  const pair = async (e) => {
    e.preventDefault();
    setPairError(null);
    const ok = await loadInfo(codeInput.trim());
    if (ok) {
      localStorage.setItem(T_KEY, codeInput.trim());
      setToken(codeInput.trim());
    } else {
      setPairError(t("kiosk_invalid_code"));
    }
  };

  const unpair = () => {
    localStorage.removeItem(T_KEY);
    localStorage.removeItem("kiosk_info");
    setToken("");
    setInfo(null);
  };

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    localStorage.setItem("kiosk_mute", m ? "1" : "0");
    if (m) window.speechSynthesis?.cancel();
  };

  const getGps = () => new Promise((res, rej) => {
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lng: p.coords.longitude }),
      rej,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 }
    );
  });

  const motionCheck = (f1, f2) => {
    const c1 = document.createElement("canvas");
    const c2 = document.createElement("canvas");
    const W = 64, H = 48;
    [c1, c2].forEach((c) => { c.width = W; c.height = H; });
    const img1 = new Image();
    const img2 = new Image();
    return new Promise((resolve) => {
      let loaded = 0;
      const done = () => {
        loaded++;
        if (loaded < 2) return;
        c1.getContext("2d").drawImage(img1, 0, 0, W, H);
        c2.getContext("2d").drawImage(img2, 0, 0, W, H);
        const d1 = c1.getContext("2d").getImageData(0, 0, W, H).data;
        const d2 = c2.getContext("2d").getImageData(0, 0, W, H).data;
        let diff = 0;
        for (let i = 0; i < d1.length; i += 4) {
          if (Math.abs(d1[i] - d2[i]) > 18 || Math.abs(d1[i + 1] - d2[i + 1]) > 18) diff++;
        }
        resolve(diff / (W * H) > 0.015);
      };
      img1.onload = done; img2.onload = done;
      img1.onerror = () => resolve(true); img2.onerror = () => resolve(true);
      img1.src = f1; img2.src = f2;
    });
  };

  const queueOffline = (teacherId, photo, coords) => {
    const rec = {
      client_uuid: crypto.randomUUID(), teacher_id: teacherId, type: attType,
      ts_device: localIso(), lat: coords?.lat || 0, lng: coords?.lng || 0, photo,
    };
    const q = [...loadQueue(), rec];
    saveQueue(q);
    setQueue(q);
    const name = teachers.find((x) => x.id === teacherId)?.name || "";
    setResult({ ok: true, offline: true, message: t("kiosk_offline"), name });
    speak(`${t("kiosk_success")}. ${name}. ${t("kiosk_offline")}`);
    setPhase("result");
    setTimeout(() => { setPhase("idle"); setResult(null); setOfflinePick(false); }, 3500);
  };

  const startStudentAttend = async () => {
    if (busyRef.current || !nisInput.trim() || phase !== "idle") return;
    busyRef.current = true;
    setResult(null);
    try {
      let coords = null;
      try { coords = await getGps(); } catch { coords = null; }
      if (!coords) {
        setResult({ ok: false, message: t("kiosk_gps_error") });
        speak(`${t("kiosk_failed")}. ${t("kiosk_gps_error")}`);
        setPhase("result");
        setTimeout(() => { setPhase("idle"); setResult(null); }, 3000);
        return;
      }
      const payload = { nis: nisInput.trim(), status: "present", lat: coords.lat, lng: coords.lng, ts_device: localIso(), client_uuid: crypto.randomUUID() };
      if (!navigator.onLine) {
        const q = [...loadQueue(), { ...payload, person_type: "student" }];
        saveQueue(q);
        setQueue(q);
        setResult({ ok: true, offline: true, message: t("kiosk_offline"), name: nisInput.trim() });
        speak(`${t("kiosk_success")}. ${t("kiosk_offline")}`);
        setNisInput("");
        setPhase("result");
        setTimeout(() => { setPhase("idle"); setResult(null); }, 3000);
        return;
      }
      try {
        const { data } = await axios.post(`${API}/kiosk/attend-student`, payload, { headers: { "X-Kiosk-Token": token }, timeout: 20000 });
        setResult({ ok: true, name: data.student_name, message: data.status === "late" ? `${t("kiosk_success")} · +${data.late_minutes}m` : t("kiosk_success") });
        speak(`${t("kiosk_success")}. ${data.student_name}`);
        setNisInput("");
      } catch (err) {
        const d = err.response?.data?.detail || "";
        let msg = t("kiosk_failed");
        if (d === "student_not_found") msg = t("kiosk_student_not_found");
        else if (d.startsWith("outside_geofence")) msg = t("kiosk_outside");
        else if (d === "already_recorded") msg = t("kiosk_already");
        setResult({ ok: false, message: msg });
        speak(`${t("kiosk_failed")}. ${msg}`);
      }
      setPhase("result");
      setTimeout(() => { setPhase("idle"); setResult(null); }, 3000);
    } finally {
      busyRef.current = false;
    }
  };

  const startAttend = async () => {
    if (busyRef.current || phase !== "idle") return;
    busyRef.current = true;
    setResult(null);
    try {
      // 1. liveness: two frames with motion
      setPhase("liveness");
      speak(t("kiosk_liveness"));
      const f1 = captureFrame(videoRef.current);
      await new Promise((r) => setTimeout(r, 1600));
      const f2 = captureFrame(videoRef.current);
      const moved = await motionCheck(f1, f2);
      if (!moved) {
        setResult({ ok: false, message: t("kiosk_liveness_failed") });
        speak(`${t("kiosk_failed")}. ${t("kiosk_liveness_failed")}`);
        setPhase("result");
        setTimeout(() => { setPhase("idle"); setResult(null); }, 3500);
        return;
      }
      // 2. GPS
      setPhase("gps");
      let coords;
      try { coords = await getGps(); } catch { coords = null; }
      // 3. send or queue offline
      if (!navigator.onLine) {
        setOfflinePick(true);
        setPhase("idle");
        window.__kioskPhoto = f2;
        window.__kioskCoords = coords;
        return;
      }
      setPhase("sending");
      try {
        const { data } = await axios.post(`${API}/kiosk/attend`, {
          photo: f2, lat: coords?.lat ?? 0, lng: coords?.lng ?? 0,
          type: attType, ts_device: localIso(), client_uuid: crypto.randomUUID(),
        }, { headers: { "X-Kiosk-Token": token }, timeout: 20000 });
        const greet = attType === "in" ? t("kiosk_welcome") : t("kiosk_goodbye");
        setResult({ ok: true, name: data.teacher_name, message: data.status === "late" ? `${t("kiosk_success")} · +${data.late_minutes}m` : t("kiosk_success"), late: data.status === "late" });
        speak(`${t("kiosk_success")}. ${data.teacher_name}. ${greet}`);
      } catch (err) {
        if (!err.response) {
          // network dropped mid-flight
          setOfflinePick(true);
          setPhase("idle");
          window.__kioskPhoto = f2;
          window.__kioskCoords = coords;
          return;
        }
        const d = err.response.data?.detail || "";
        let msg = t("kiosk_failed");
        let voiceMsg = msg;
        if (d.startsWith("outside_geofence")) { msg = `${t("kiosk_outside")}${d.includes(":") ? ` (${d.split(":")[1]}m)` : ""}`; voiceMsg = t("kiosk_outside"); }
        else if (d === "face_not_found") { msg = t("kiosk_face_not_found"); voiceMsg = t("kiosk_voice_not_registered"); }
        else if (d.startsWith("already_recorded")) {
          const nm = d.includes(":") ? d.split(":").slice(1).join(":") : "";
          msg = nm ? `${t("kiosk_already")} · ${nm}` : t("kiosk_already");
          voiceMsg = nm ? `${t("kiosk_already")}, ${nm}` : t("kiosk_already");
        }
        else if (d === "no_enrolled") { msg = t("kiosk_no_enrolled"); voiceMsg = msg; }
        else if (d === "no_checkin") { msg = t("kiosk_no_checkin"); voiceMsg = msg; }
        else if (d === "no_face_detected") { msg = t("kiosk_no_face"); voiceMsg = msg; }
        else if (d === "multiple_faces") { msg = t("kiosk_multi_face"); voiceMsg = msg; }
        else if (d.startsWith("too_early")) {
          const p = d.split(":");
          const tm = `${p[1]}:${p[2]}`;
          const mins = p[3];
          msg = mins ? t("kiosk_too_early_min", { time: tm, minutes: mins }) : t("kiosk_too_early", { time: tm });
          voiceMsg = msg;
        }
        else if (!coords) { msg = t("kiosk_gps_error"); voiceMsg = msg; }
        setResult({ ok: false, message: msg });
        speak(`${t("kiosk_failed")}. ${voiceMsg}`);
      }
      setPhase("result");
      setTimeout(() => { setPhase("idle"); setResult(null); }, 3500);
    } finally {
      busyRef.current = false;
    }
  };

  // ---------- pairing screen ----------
  if (!token || !info) {
    return (
      <div className="min-h-screen bg-[#0B1320] flex items-center justify-center p-6">
        <form onSubmit={pair} data-testid="kiosk-pair-form" className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-white flex items-center justify-center mb-4 overflow-hidden p-2.5">
              <img src="/logo.png" alt="EduGateID" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-white text-2xl font-extrabold">{t("app_name")} · Kiosk</h1>
            <p className="text-slate-400 text-sm mt-1">{t("kiosk_enter_code")}</p>
          </div>
          <input
            data-testid="kiosk-code-input"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            placeholder="KIOSK-XXXXXX"
            className="w-full text-center font-mono text-lg tracking-widest rounded-2xl bg-white/5 border border-white/10 px-4 py-4 text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition uppercase"
          />
          {pairError && <p data-testid="kiosk-pair-error" className="text-red-400 text-sm text-center">{pairError}</p>}
          <button data-testid="kiosk-pair-btn" className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-2xl py-4 transition-colors">
            {t("kiosk_pair")}
          </button>
          <div className="flex justify-center"><LangSwitch dark /></div>
        </form>
      </div>
    );
  }

  // ---------- kiosk screen ----------
  const phaseText = { liveness: t("kiosk_liveness"), gps: t("kiosk_gps_getting"), sending: t("kiosk_processing") }[phase];

  return (
    <div className="min-h-screen bg-[#0B1320] flex flex-col select-none" data-testid="kiosk-screen">
      <header className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-white font-extrabold" data-testid="kiosk-school-name">{info.school?.name}</p>
          <p className="text-slate-400 text-xs">{new Date().toLocaleDateString(i18n.language === "en" ? "en-US" : "id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex items-center gap-2">
          {!online && <span data-testid="kiosk-offline-badge" className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full"><WifiOff className="w-3.5 h-3.5" /> Offline</span>}
          {queue.length > 0 && <span data-testid="kiosk-queue-badge" className="text-xs font-bold text-sky-400 bg-sky-400/10 px-2.5 py-1 rounded-full">{t("kiosk_queue")}: {queue.length}</span>}
          <LangSwitch dark />
          <button data-testid="kiosk-mute-btn" onClick={toggleMute} className="p-2 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 transition-colors">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button data-testid="kiosk-unpair-btn" onClick={unpair} className="p-2 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 transition-colors"><Unplug className="w-4 h-4" /></button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8 gap-5">
        <div className="relative w-full max-w-md aspect-[4/3] rounded-3xl overflow-hidden bg-slate-900 border border-white/10">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" data-testid="kiosk-video" />
          <div className={`absolute inset-6 rounded-2xl border-2 border-dashed pointer-events-none transition-colors ${phase === "liveness" ? "border-amber-400 animate-pulse" : "border-teal-500/40"}`} />
          {phaseText && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <p data-testid="kiosk-phase-text" className="text-white font-bold text-lg animate-pulse">{phaseText}</p>
            </div>
          )}
          {phase === "result" && result && (
            <div data-testid="kiosk-result" className={`absolute inset-0 flex flex-col items-center justify-center gap-1 ${result.ok ? "bg-emerald-600/90" : "bg-red-600/90"}`}>
              <p className="text-white font-extrabold text-2xl">{result.ok ? t("kiosk_success") : t("kiosk_failed")}</p>
              {result.name && <p className="text-white/90 font-bold text-xl" data-testid="kiosk-result-name">{result.name}</p>}
              <p className="text-white/80 text-sm px-6 text-center" data-testid="kiosk-result-msg">{result.message}</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 bg-white/5 rounded-full p-1.5" data-testid="kiosk-type-toggle">
          <button data-testid="kiosk-type-in" onClick={() => setAttType("in")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${attType === "in" ? "bg-teal-600 text-white" : "text-slate-400"}`}>
            <LogIn className="w-4 h-4" /> {t("check_in")}
          </button>
          <button data-testid="kiosk-type-out" onClick={() => setAttType("out")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-colors ${attType === "out" ? "bg-teal-600 text-white" : "text-slate-400"}`}>
            <LogOut className="w-4 h-4" /> {t("check_out")}
          </button>
        </div>

        <button
          data-testid="kiosk-attend-btn"
          onClick={startAttend}
          disabled={phase !== "idle"}
          className="w-full max-w-md bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-extrabold text-xl rounded-3xl py-6 transition-all active:scale-[0.98] shadow-lg shadow-teal-900/40"
        >
          {attType === "in" ? t("check_in") : t("check_out")}
        </button>

        <div className="w-full max-w-md space-y-3 pt-3 mt-1 border-t border-white/10" data-testid="kiosk-student-panel">
          <p className="text-center text-slate-500 text-xs">{t("kiosk_or_nis")}</p>
          <input data-testid="kiosk-nis-input" value={nisInput} onChange={(e) => setNisInput(e.target.value)} inputMode="numeric"
            placeholder={t("kiosk_nis")}
            className="w-full text-center font-mono text-xl tracking-widest rounded-2xl bg-white/5 border border-white/10 px-4 py-4 text-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition" />
          <button data-testid="kiosk-student-submit" onClick={startStudentAttend} disabled={phase !== "idle" || !nisInput.trim()}
            className="w-full bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white font-bold text-base rounded-2xl py-4 transition-all active:scale-[0.98]">
            {t("kiosk_nis_submit")}
          </button>
        </div>

        {info.locations?.length > 0 && (
          <p className="text-slate-500 text-xs text-center">
            GPS Geofence: {info.locations.map((l) => `${l.name} (r=${l.radius_m}m)`).join(" · ")}
          </p>
        )}
      </div>

      {offlinePick && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" data-testid="offline-picker">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-sm p-5 max-h-[70vh] overflow-y-auto">
            <p className="text-white font-bold mb-1">{t("kiosk_select_teacher")}</p>
            <p className="text-amber-400 text-xs mb-4">{t("kiosk_offline")}</p>
            <div className="space-y-2">
              {teachers.map((tc) => (
                <button key={tc.id} data-testid={`offline-teacher-${tc.id}`} onClick={() => queueOffline(tc.id, window.__kioskPhoto || "", window.__kioskCoords)}
                  className="w-full text-left px-4 py-3 rounded-2xl bg-white/5 hover:bg-teal-600/20 text-white font-semibold text-sm transition-colors">
                  {tc.name}
                </button>
              ))}
            </div>
            <button data-testid="offline-picker-cancel" onClick={() => setOfflinePick(false)} className="mt-4 w-full py-2.5 rounded-xl bg-white/5 text-slate-400 text-sm font-bold">{t("cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
