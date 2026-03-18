import React, { useRef, useState, useEffect, useContext } from 'react';
import jsQR from 'jsqr';
import { Camera, Upload, X } from 'lucide-react';
import { LanguageContext } from '../utils/i18n';

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QRCodeScanner: React.FC<QRCodeScannerProps> = ({ onScan, onClose }) => {
  const { t } = useContext(LanguageContext);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string>('');
  const animationFrameRef = useRef<number | null>(null);

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    } catch (err) {
      console.error("Camera Error:", err);
      setError(t.errCamAccess);
    }
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });

          if (code && code.data) {
            stopCamera();
            onScan(code.data);
            return;
          }
        } catch (e) {
          // Ignore processing errors (e.g. out of memory or corrupted frame)
        }
      }
    }
    animationFrameRef.current = requestAnimationFrame(tick);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
          });
          if (code) {
            onScan(code.data);
          } else {
            setError(t.errNoQR);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-2">
          {error}
        </div>
      )}

      <div className="relative bg-black rounded-lg overflow-hidden aspect-square md:aspect-video flex items-center justify-center">
        {!isCameraActive && (
           <div className="text-gray-400 flex flex-col items-center">
             <Camera className="w-12 h-12 mb-2 opacity-50" />
             <p>{t.camInactive}</p>
           </div>
        )}
        <video ref={videoRef} className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`} muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Scan Line Overlay */}
        {isCameraActive && (
          <div className="absolute inset-0 pointer-events-none">
             <div className="w-full h-1 bg-blue-500/50 absolute top-1/2 -translate-y-1/2 shadow-[0_0_15px_rgba(59,130,246,0.5)] animate-pulse"></div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!isCameraActive ? (
          <button
            onClick={startCamera}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
          >
            <Camera size={18} />
            {t.btnStartCam}
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition"
          >
            <X size={18} />
            {t.btnStopCam}
          </button>
        )}
        
        <label className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition cursor-pointer">
          <Upload size={18} />
          {t.btnUploadImg}
          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </label>
      </div>
    </div>
  );
};

export default QRCodeScanner;