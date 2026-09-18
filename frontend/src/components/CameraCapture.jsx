import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Camera, RefreshCcw, Check, X } from "lucide-react";

export function captureFrame(video, maxW = 480) {
  const scale = Math.min(1, maxW / video.videoWidth);
  const c = document.createElement("canvas");
  c.width = video.videoWidth * scale;
  c.height = video.videoHeight * scale;
  c.getContext("2d").drawImage(video, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.7);
}

export default function CameraCapture({ onDone, onClose, testid = "camera" }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((s) => {
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setError(t("kiosk_camera_error")));
    return () => streamRef.current?.getTracks().forEach((tr) => tr.stop());
  }, [t]);

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
          {error ? (
            <p className="absolute inset-0 flex items-center justify-center text-red-300 text-sm p-4 text-center" data-testid={`${testid}-error`}>{error}</p>
          ) : photo ? (
            <img src={photo} alt="capture" className="w-full h-full object-cover" data-testid={`${testid}-preview`} />
          ) : (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" data-testid={`${testid}-video`} />
          )}
        </div>
        <div className="p-4 flex gap-2">
          {!photo ? (
            <button
              data-testid={`${testid}-capture-btn`}
              disabled={!!error}
              onClick={() => setPhoto(captureFrame(videoRef.current))}
              className="flex-1 flex items-center justify-center gap-2 bg-teal-700 text-white font-semibold rounded-xl py-2.5 text-sm hover:bg-teal-800 transition-colors disabled:opacity-40"
            >
              <Camera className="w-4 h-4" /> {t("capture")}
            </button>
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
