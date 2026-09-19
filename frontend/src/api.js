import axios from "axios";
import i18n from "./i18n";

const api = axios.create({ baseURL: `${process.env.REACT_APP_BACKEND_URL}/api` });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

const CODE_KEYS = {
  no_face_detected: "kiosk_no_face",
  multiple_faces: "kiosk_multi_face",
  invalid_photo: "invalid_photo",
  face_already_enrolled: "face_already_enrolled",
  trial_expired: "trial_expired",
  email_taken: "email_taken",
  invalid_or_expired: "reset_invalid",
  password_too_short: "password_too_short",
};

export const errMsg = (e, fallback = "Terjadi kesalahan") => {
  const d = e.response?.data?.detail;
  if (typeof d === "string") {
    const idx = d.indexOf(":");
    const code = idx > 0 ? d.slice(0, idx) : d;
    const arg = idx > 0 ? d.slice(idx + 1) : undefined;
    const key = CODE_KEYS[code];
    return key ? i18n.t(key, arg ? { name: arg } : {}) : d;
  }
  if (Array.isArray(d)) return d.map((x) => x.msg).join(" ");
  return e.message || fallback;
};

export default api;
