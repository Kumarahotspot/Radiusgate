import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, RefreshCcw, Check, X, Upload } from "lucide-react";

export function captureFrame(video, maxW = 480) {
  const scale = Math.min(1, maxW / video.videoWidth);
  const c = document.createElement("canvas");
  c.width = video.videoWidth * scale;
  c.height = video.videoHeight * scale;
  c.getContext("2d").drawImage(video, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.7);
}

export function cameraErrorKey(err) {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return "camera_error_https";
  const name = err?.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") return "camera_error_permission";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "camera_error_no_device";
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") return "camera_error_in_use";
  return "kiosk_camera_error";
}

export function startCamera(videoRef, streamRef, onError) {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    onError("camera_error_https");
    return;
  }
  const attach = (s) => {
    streamRef.current = s;
    if (videoRef.current) videoRef.current.srcObject = s;
  };
  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "user" }, audio: false })
    .then(attach)
    .catch((err) => {
      if (err?.name === "OverconstrainedError") {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: false })
          .then(attach)
          .catch((e2) => onError(cameraErrorKey(e2)));
      } else {
        onError(cameraErrorKey(err));
      }
    });
}

function fileToDataUrl(file, maxW = 480) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement("canvas");
        c.width = img.width * scale;
        c.height = img.height * scale;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function CameraCapture({ onDone, onClose, testid = "camera" }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [errorKey, setErrorKey] = useState(null);

  useEffect(() => {
    startCamera(videoRef, streamRef, setErrorKey);
    return () => streamRef.current?.getTracks().forEach((tr) => tr.stop());
  }, []);

  const retry = () => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    setErrorKey(null);
    startCamera(videoRef, streamRef, setErrorKey);
  };

  const pickFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setPhoto(await fileToDataUrl(f));
    } catch {
      setErrorKey("kiosk_camera_error");
    }
    e.target.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" data-testid={`${testid}-modal`}>
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="font-bold text-slate-800 text-sm">{t("enroll_face")}</p>
          <button data-testid={`${testid}-close`} onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="aspect-[4/3] bg-slate-900 relative">
          {errorKey ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-red-300 text-sm p-4 text-center" data-testid={`${testid}-error`}>
              <p>{t(errorKey)}</p>
              <button data-testid={`${testid}-retry-btn`} onClick={retry} className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-semibold hover:bg-slate-600">
                {t("camera_retry")}
              </button>
            </div>
          ) : photo ? (
            <img src={photo} alt="capture" className="w-full h-full object-cover" data-testid={`${testid}-preview`} />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" data-testid={`${testid}-video`} />
          )}
        </div>
        <div className="p-4 flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} data-testid={`${testid}-file-input`} />
          {!photo ? (
            <>
              <button
                data-testid={`${testid}-capture-btn`}
                disabled={!!errorKey}
                onClick={() => setPhoto(captureFrame(videoRef.current))}
                className="flex-1 flex items-center justify-center gap-2 bg-teal-700 text-white font-semibold rounded-xl py-2.5 text-sm hover:bg-teal-800 transition-colors disabled:opacity-40"
              >
                <Camera className="w-4 h-4" /> {t("capture")}
              </button>
              <button
                data-testid={`${testid}-upload-btn`}
                onClick={() => fileRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 font-semibold rounded-xl py-2.5 px-3 text-sm hover:bg-slate-200 transition-colors"
              >
                <Upload className="w-4 h-4" /> {t("upload_photo")}
              </button>
            </>
          ) : (
            <>
              <button
                data-testid={`${testid}-retake-btn`}
                onClick={() => setPhoto(null)}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 font-semibold rounded-xl py-2.5 text-sm hover:bg-slate-200 transition-colors"
              >
                <RefreshCcw className="w-4 h-4" /> {t("retake")}
              </button>
              <button
                data-testid={`${testid}-save-btn`}
                onClick={() => onDone(photo)}
                className="flex-1 flex items-center justify-center gap-2 bg-teal-700 text-white font-semibold rounded-xl py-2.5 text-sm hover:bg-teal-800 transition-colors"
              >
                <Check className="w-4 h-4" /> {t("save")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
