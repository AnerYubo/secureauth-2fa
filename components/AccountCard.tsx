import React, { useState, useEffect, useContext } from 'react';
import { OTPAccount, AppLogo } from '../types';
import { generateToken } from '../utils/crypto';
import { Trash2, Edit2, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { LanguageContext } from '../utils/i18n';

interface AccountCardProps {
  account: OTPAccount;
  logo?: AppLogo;
  onDelete: (id: string) => void;
  onEdit: (account: OTPAccount) => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  showQR: boolean;
  onToggleQR: (id: string) => void;
  color?: 'blue' | 'orange' | 'emerald';
}

const AccountCard: React.FC<AccountCardProps> = ({ account, logo, onDelete, onEdit, isSelected, onToggleSelect, showQR, onToggleQR, color = 'blue' }) => {
  const { t } = useContext(LanguageContext);
  const [tokenData, setTokenData] = useState(generateToken(account.secret, account.period));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Update immediately
    setTokenData(generateToken(account.secret, account.period));
    const interval = setInterval(() => {
      setTokenData(generateToken(account.secret, account.period));
    }, 1000);
    return () => clearInterval(interval);
  }, [account.secret, account.period]);

  const handleCopy = () => {
    navigator.clipboard.writeText(tokenData.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedToken = tokenData.token.replace(/(.{3})/g, "$1 ").trim();
  const otpUri = `otpauth://totp/${encodeURIComponent(account.issuer)}:${encodeURIComponent(account.account)}?secret=${account.secret}&issuer=${encodeURIComponent(account.issuer)}&period=${account.period}`;

  // Theme based styles
  const getThemeStyles = (c: string) => {
    switch (c) {
        case 'emerald':
            return {
                borderColor: 'border-emerald-500 ring-1 ring-emerald-500 dark:border-emerald-400 dark:ring-emerald-400',
                checkboxColor: 'text-emerald-600 focus:ring-emerald-500 dark:text-emerald-400',
                progressColor: 'bg-emerald-500 dark:bg-emerald-400',
                hoverText: 'hover:text-emerald-600 dark:hover:text-emerald-400',
                hoverBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30',
                qrActiveBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
            };
        case 'orange':
            return {
                borderColor: 'border-orange-500 ring-1 ring-orange-500 dark:border-orange-400 dark:ring-orange-400',
                checkboxColor: 'text-orange-600 focus:ring-orange-500 dark:text-orange-400',
                progressColor: 'bg-orange-500 dark:bg-orange-400',
                hoverText: 'hover:text-orange-600 dark:hover:text-orange-400',
                hoverBg: 'hover:bg-orange-50 dark:hover:bg-orange-900/30',
                qrActiveBg: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
            };
        case 'blue':
        default:
            return {
                borderColor: 'border-blue-500 ring-1 ring-blue-500 dark:border-blue-400 dark:ring-blue-400',
                checkboxColor: 'text-blue-600 focus:ring-blue-500 dark:text-blue-400',
                progressColor: 'bg-blue-500 dark:bg-blue-400',
                hoverText: 'hover:text-blue-600 dark:hover:text-blue-400',
                hoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-900/30',
                qrActiveBg: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
            };
    }
  }

  const styles = getThemeStyles(color);

  const borderColor = styles.borderColor;
  const checkboxColor = styles.checkboxColor;
  const progressBarColor = tokenData.seconds < 5 ? 'bg-red-500 dark:bg-red-400' : styles.progressColor;
  const hoverText = styles.hoverText;
  const hoverBg = styles.hoverBg;
  const qrActiveBg = showQR ? styles.qrActiveBg : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700';

  // Generate a soft background color based on issuer char
  const getAvatarColor = (name: string) => {
    const colors = ['bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300', 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300', 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300', 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300'];
    const index = name.length % colors.length;
    return colors[index];
  };

  const avatarClass = getAvatarColor(account.issuer || 'U');

  return (
    <div 
      className={`relative bg-white dark:bg-gray-800 rounded-xl transition-all duration-200 flex flex-col overflow-hidden group border ${isSelected ? `${borderColor} shadow-md` : 'border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md'}`}
      onClick={(e) => {
          // Prevent accidental copy when selecting logic might change later
      }}
    >
      {/* Top Section: Issuer & Controls */}
      <div className="px-4 pt-3 pb-2 flex justify-between items-start">
        <div className="flex items-center gap-2.5 overflow-hidden pr-2 min-w-0 flex-1">
            {logo ? (
                // Custom Logo
                <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                    <img src={logo.data} alt={logo.name} className="w-full h-full object-contain" />
                </div>
            ) : (
                // Default Avatar
                <div 
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base shrink-0 ${avatarClass}`}
                >
                    {(account.issuer || '?').charAt(0).toUpperCase()}
                </div>
            )}
            <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm leading-tight" title={account.issuer}>
                    {account.issuer || t.unknownIssuer}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-tight" title={account.account}>
                    {account.account}
                </p>
            </div>
        </div>
        
        {/* Selection Checkbox */}
        <div className="shrink-0 ml-2 z-10" onClick={(e) => e.stopPropagation()}>
             <input 
                type="checkbox" 
                checked={isSelected}
                onChange={() => onToggleSelect(account.id)}
                className={`w-4 h-4 rounded border-gray-300 dark:border-gray-600 cursor-pointer transition-opacity ${checkboxColor} ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
             />
        </div>
      </div>

      {/* Main Content: Token */}
      <div className="flex-1 flex flex-col justify-center items-center py-2 relative px-3 min-h-[90px]">
         {showQR ? (
            <div className="animate-in fade-in zoom-in duration-200 flex flex-col items-center">
                 <div className="bg-white p-1.5 rounded-lg border shadow-sm">
                    <QRCodeSVG value={otpUri} size={100} />
                 </div>
                 <button type="button" onClick={() => onToggleQR(account.id)} className={`text-[10px] text-gray-500 dark:text-gray-400 mt-1 ${hoverText} font-medium`}>
                    {t.backToCode}
                 </button>
            </div>
         ) : (
            <>
                <div 
                    className={`text-4xl sm:text-5xl font-mono font-extrabold text-gray-800 dark:text-gray-100 tracking-widest cursor-pointer hover:scale-105 active:scale-95 transition-all text-center w-full truncate my-1 leading-none`}
                    onClick={handleCopy}
                    title="Click to copy"
                >
                    {formattedToken}
                </div>
                
                {/* Notes centered below code */}
                {account.notes && (
                    <div className="w-full px-2 text-center mt-1 mb-0.5">
                         <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate w-full bg-gray-50 dark:bg-gray-700/50 rounded px-1.5 py-0.5 inline-block max-w-full" title={account.notes}>
                            {account.notes}
                         </p>
                    </div>
                )}
                
                {/* Copied Badge */}
                <div 
                    className={`absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-200 pointer-events-none ${copied ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
                >
                    <span className="text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded-full shadow-sm border border-green-200 dark:border-green-800">
                        {t.copied}
                    </span>
                </div>
            </>
         )}
      </div>

      {/* Bottom Section: Progress & Actions */}
      <div className="bg-gray-50/50 dark:bg-gray-700/30 px-3 py-2 border-t border-gray-100 dark:border-gray-700 mt-auto">
         <div className="flex justify-between items-center mb-1.5">
            <div className="text-[10px] font-medium text-gray-400 font-mono">
                {tokenData.seconds}s
            </div>

            <div className="flex gap-1">
                 <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleQR(account.id); }} 
                    className={`p-1.5 rounded-md transition ${qrActiveBg}`}
                    title="QR Code"
                >
                    <QrCode size={14} className="pointer-events-none" />
                 </button>
                 <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(account); }} 
                    className={`p-1.5 text-gray-400 dark:text-gray-500 ${hoverText} ${hoverBg} rounded-md transition`}
                    title={t.edit}
                >
                    <Edit2 size={14} className="pointer-events-none" />
                </button>
                 <button 
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(account.id); }} 
                    className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition"
                    title={t.delete}
                >
                    <Trash2 size={14} className="pointer-events-none" />
                </button>
            </div>
         </div>

         {/* Progress Bar */}
         <div className="relative h-1 w-full bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div 
                className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-linear ${progressBarColor}`}
                style={{ width: `${tokenData.progress}%` }}
            />
         </div>
      </div>
    </div>
  );
};

export default AccountCard;