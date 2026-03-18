import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const icons = {
    success: <CheckCircle size={20} className="text-green-500" />,
    error: <AlertCircle size={20} className="text-red-500" />,
    info: <Info size={20} className="text-blue-500" />
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg shadow-lg border dark:border-gray-700 animate-in slide-in-from-top-2 duration-300 max-w-sm w-full bg-white dark:bg-gray-800 z-[110]`}>
       <div className="shrink-0">{icons[toast.type]}</div>
       <p className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200">{toast.message}</p>
       <button onClick={() => onClose(toast.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
         <X size={16} />
       </button>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; onClose: (id: string) => void }> = ({ toasts, onClose }) => {
    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none px-4 sm:px-0">
            {toasts.map(t => (
                <div key={t.id} className="pointer-events-auto">
                    <Toast toast={t} onClose={onClose} />
                </div>
            ))}
        </div>
    );
};