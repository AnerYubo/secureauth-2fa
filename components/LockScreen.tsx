import React, { useState, useContext } from 'react';
import { Lock, AlertCircle, KeyRound, RefreshCcw } from 'lucide-react';
import { LanguageContext } from '../utils/i18n';

interface LockScreenProps {
  onUnlock: (password: string) => Promise<boolean>;
  onReset: () => void;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, onReset }) => {
  const { t } = useContext(LanguageContext);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    
    setLoading(true);
    setError(false);
    
    // Give UI a moment to update loading state before heavy crypto (though async usually handles it)
    setTimeout(async () => {
        const success = await onUnlock(password);
        if (!success) {
            setError(true);
            setLoading(false);
        } else {
            // Success logic handled by parent (unmounting this component)
        }
    }, 50);
  };

  const handleReset = () => {
      if (confirm(t.resetWarning)) {
          onReset();
      }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
       <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
           <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600 dark:text-blue-400">
               <Lock size={32} />
           </div>
           
           <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t.lockScreenTitle}</h1>
           <p className="text-gray-500 dark:text-gray-400 mb-6">{t.enterPassword}</p>

           <form onSubmit={handleUnlock} className="space-y-4">
               <div>
                   <input 
                      type="password" 
                      className={`w-full p-3 border rounded-lg outline-none transition text-center text-lg bg-white dark:bg-gray-700 dark:text-white ${error ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}`}
                      placeholder="••••••"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(false); }}
                      autoFocus
                   />
                   {error && <p className="text-red-500 text-sm mt-2 flex items-center justify-center gap-1"><AlertCircle size={14}/> {t.wrongPassword}</p>}
               </div>

               <button 
                  type="submit" 
                  disabled={loading || !password}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
               >
                   {loading ? '...' : t.unlock}
               </button>
           </form>

           <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
               {!showResetConfirm ? (
                   <button 
                        onClick={() => setShowResetConfirm(true)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm font-medium flex items-center justify-center gap-1 mx-auto"
                   >
                        {t.forgotPassword}
                   </button>
               ) : (
                   <div className="animate-in fade-in slide-in-from-top-2">
                       <p className="text-xs text-red-500 mb-2">{t.resetWarning}</p>
                       <button 
                            onClick={handleReset}
                            className="text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-medium w-full"
                       >
                            {t.resetConfirm}
                       </button>
                       <button 
                            onClick={() => setShowResetConfirm(false)}
                            className="text-gray-500 mt-2 text-xs hover:underline"
                       >
                            {t.btnCancel}
                       </button>
                   </div>
               )}
           </div>
       </div>
    </div>
  );
};

export default LockScreen;