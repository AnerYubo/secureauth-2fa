import React, { useState, useContext, useRef, useEffect } from 'react';
import { X, Upload, Download, Check, RefreshCw, Copy, Image as ImageIcon, ChevronUp, Grid, List, Trash2, ArrowRight, FileJson, CheckSquare, Square, KeyRound, AlertTriangle, Shield, ShieldOff, Save, CheckCircle, Lock, ArrowLeft, Link, Unlock, ShieldCheck, Info, ChevronLeft, ChevronRight, Settings, Smartphone, Layers } from 'lucide-react';
import { ImportCandidate, OTPAccount, AppLogo } from '../types';
import { parseLine, generateRandomSecret, parseOTPAuthURL, generateShortId } from '../utils/crypto';
import QRCodeScanner from './QRCodeScanner';
import { LanguageContext } from '../utils/i18n';
import { decodeQRFromImage } from '../utils/qrHelper';
import { QRCodeSVG } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import LogoSelect from './LogoSelect';
import { generateMigrationURI, parseMigrationURI, Algorithm, DigitCount, OtpType } from '../lib/google-auth/index';

// Theme Helper
const getTheme = (color: string = 'blue') => {
    switch(color) {
        case 'emerald':
             return {
                btn: 'bg-emerald-600 hover:bg-emerald-700',
                text: 'text-emerald-600 dark:text-emerald-400',
                border: 'border-emerald-500 dark:border-emerald-400',
                ring: 'ring-emerald-500',
                bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
                checkbox: 'text-emerald-600 focus:ring-emerald-500 dark:text-emerald-400',
                selectionBorder: 'border-emerald-500 dark:border-emerald-400',
                selectionRing: 'ring-emerald-500',
                checkBg: 'bg-emerald-600 dark:bg-emerald-500',
                icon: 'text-emerald-600 dark:text-emerald-400'
            };
        case 'orange':
            return {
                btn: 'bg-orange-600 hover:bg-orange-700',
                text: 'text-orange-600 dark:text-orange-400',
                border: 'border-orange-500 dark:border-orange-400',
                ring: 'ring-orange-500',
                bgLight: 'bg-orange-50 dark:bg-orange-900/20',
                checkbox: 'text-orange-600 focus:ring-orange-500 dark:text-orange-400',
                selectionBorder: 'border-emerald-500 dark:border-emerald-400',
                selectionRing: 'ring-emerald-500',
                checkBg: 'bg-orange-600 dark:bg-orange-500',
                icon: 'text-orange-600 dark:text-orange-400'
            };
        case 'blue':
        default:
            return {
                btn: 'bg-blue-600 hover:bg-blue-700',
                text: 'text-blue-600 dark:text-blue-400',
                border: 'border-blue-500 dark:border-blue-400',
                ring: 'ring-blue-500',
                bgLight: 'bg-blue-50 dark:bg-blue-900/20',
                checkbox: 'text-blue-600 focus:ring-blue-500 dark:text-blue-400',
                selectionBorder: 'border-blue-500 dark:border-blue-400',
                selectionRing: 'ring-blue-500',
                checkBg: 'bg-blue-600 dark:bg-blue-500',
                icon: 'text-blue-600 dark:text-blue-400'
            };
    }
};


// --- Base Modal (Centered) ---
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; className?: string }> = ({ title, onClose, children, className="" }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    {/* Backdrop */}
    <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
    />
    
    {/* Modal Content */}
    <div className={`relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${className}`}>
      <div className="flex justify-between items-center px-5 py-3 border-b dark:border-gray-700 shrink-0 bg-white dark:bg-gray-800">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white truncate pr-4">{title}</h2>
        <button onClick={onClose} className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition text-gray-600 dark:text-gray-300">
            <X size={18} />
        </button>
      </div>
      <div className="p-5 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  </div>
);

// --- Add/Edit Account Modal ---
interface AccountFormModalProps {
  onClose: () => void;
  onSave: (account: Omit<OTPAccount, 'id' | 'createdAt'>) => void;
  onBatchScan?: (candidates: ImportCandidate[]) => void;
  initialData?: OTPAccount;
  logos: AppLogo[];
  color?: 'blue' | 'orange' | 'emerald';
}

export const AccountFormModal: React.FC<AccountFormModalProps> = ({ onClose, onSave, onBatchScan, initialData, logos, color = 'blue' }) => {
  const { t } = useContext(LanguageContext);
  const theme = getTheme(color);
  const [mode, setMode] = useState<'manual' | 'scan'>(initialData ? 'manual' : 'manual');
  const [formData, setFormData] = useState({
    issuer: '',
    account: '',
    secret: '',
    period: 30,
    notes: '',
    logoId: ''
  });

  useEffect(() => {
    if (initialData) {
        setFormData({
            issuer: initialData.issuer,
            account: initialData.account,
            secret: initialData.secret,
            period: initialData.period,
            notes: initialData.notes || '',
            logoId: initialData.logoId || ''
        });
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.issuer && formData.account && formData.secret) {
      onSave(formData);
      onClose();
    }
  };

  const handleScan = (data: string) => {
    if (data.startsWith('otpauth-migration://')) {
        try {
            const migrationAccounts = parseMigrationURI(data);
            if (migrationAccounts.length === 0) {
                 alert('No accounts found in migration data.');
                 return;
            }
            if (migrationAccounts.length === 1) {
                 onSave({
                    issuer: migrationAccounts[0].issuer || 'Unknown',
                    account: migrationAccounts[0].name || 'Unknown',
                    secret: migrationAccounts[0].secret,
                    period: 30, 
                    notes: 'Imported via Migration QR',
                    logoId: ''
                 });
                 onClose();
            } 
            else if (onBatchScan) {
                const candidates: ImportCandidate[] = migrationAccounts.map(acc => ({
                    raw: 'otpauth-migration import',
                    issuer: acc.issuer,
                    account: acc.name,
                    secret: acc.secret,
                    period: 30,
                    isValid: true,
                    notes: 'Imported via Migration Package'
                }));
                onBatchScan(candidates);
            } else {
                alert(`Scanned ${migrationAccounts.length} accounts, but batch import is not available here.`);
            }
            return;
        } catch (e) {
            console.error(e);
            alert("Failed to parse migration URI");
            return;
        }
    }
    if (data.startsWith('otpauth://')) {
        const parsed = parseOTPAuthURL(data);
        if (parsed) {
             onSave({
                issuer: parsed.issuer || 'Unknown',
                account: parsed.account || 'Unknown',
                secret: parsed.secret || '',
                period: parsed.period || 30,
                notes: 'Scanned via QR',
                logoId: ''
             });
             onClose();
             return;
        }
    }
    alert('Invalid QR Code format.');
  };

  const generateSecret = () => {
    setFormData(prev => ({ ...prev, secret: generateRandomSecret() }));
  };

  return (
    <Modal title={initialData ? t.modalEditTitle : t.modalAddTitle} onClose={onClose}>
      {!initialData && (
          <div className="flex gap-4 mb-5 border-b dark:border-gray-700">
            <button 
              className={`pb-2 px-1 font-medium text-sm transition ${mode === 'manual' ? `${theme.text} border-b-2 ${theme.border}` : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setMode('manual')}
            >
              {t.tabManual}
            </button>
            <button 
              className={`pb-2 px-1 font-medium text-sm transition ${mode === 'scan' ? `${theme.text} border-b-2 ${theme.border}` : 'text-gray-500 dark:text-gray-400'}`}
              onClick={() => setMode('scan')}
            >
              {t.tabScan}
            </button>
          </div>
      )}

      {mode === 'manual' ? (
        <form onSubmit={handleSubmit} className="space-y-4 pb-20">
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.labelIssuer}</label>
                <input required type="text" placeholder="e.g. Google" className={`w-full p-2 text-sm border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white`} 
                  value={formData.issuer} onChange={e => setFormData({...formData, issuer: e.target.value})} />
             </div>
             <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.labelAccount}</label>
                <input required type="text" placeholder="e.g. alice@example.com" className={`w-full p-2 text-sm border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white`} 
                  value={formData.account} onChange={e => setFormData({...formData, account: e.target.value})} />
             </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.labelSecret}</label>
            <div className="flex gap-2">
                <input required type="text" placeholder="Base32 Secret" className={`flex-1 p-2 text-sm border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white`} 
                value={formData.secret} onChange={e => setFormData({...formData, secret: e.target.value})} />
                <button type="button" onClick={generateSecret} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600" title={t.btnGenerate}>
                    <RefreshCw size={16} />
                </button>
            </div>
            {!initialData && <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{t.msgLeaveBlank}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.labelPeriod}</label>
                <input type="number" min="15" step="1" className={`w-full p-2 text-sm border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white`} 
                  value={formData.period} onChange={e => setFormData({...formData, period: parseInt(e.target.value) || 30})} />
             </div>
             <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.labelNotes}</label>
                <input type="text" placeholder="Tag or description" className={`w-full p-2 text-sm border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white`} 
                  value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
             </div>
          </div>

          <div className="relative">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.labelLogo}</label>
              <LogoSelect 
                 logos={logos}
                 value={formData.logoId}
                 onChange={(val) => setFormData({...formData, logoId: val})}
                 color={color}
              />
          </div>

          <button type="submit" className={`w-full ${theme.btn} text-white py-2 rounded-lg font-medium mt-4 text-sm`}>
            {t.btnSave}
          </button>
        </form>
      ) : (
        <QRCodeScanner onScan={handleScan} onClose={onClose} />
      )}
    </Modal>
  );
};

interface BatchEditModalProps {
  onClose: () => void;
  onSave: (updates: Partial<OTPAccount>) => void;
  logos: AppLogo[];
  color?: 'blue' | 'orange' | 'emerald';
}

export const BatchEditModal: React.FC<BatchEditModalProps> = ({ onClose, onSave, logos, color = 'blue' }) => {
  const { t } = useContext(LanguageContext);
  const theme = getTheme(color);
  
  const [issuer, setIssuer] = useState('');
  const [account, setAccount] = useState('');
  const [notes, setNotes] = useState('');
  const [logoId, setLogoId] = useState<string>(''); 
  
  const [updateIssuer, setUpdateIssuer] = useState(false);
  const [updateAccount, setUpdateAccount] = useState(false);
  const [updateNotes, setUpdateNotes] = useState(false);
  const [updateLogo, setUpdateLogo] = useState(false);

  const handleSave = () => {
      const updates: Partial<OTPAccount> = {};
      if (updateIssuer) updates.issuer = issuer;
      if (updateAccount) updates.account = account;
      if (updateNotes) updates.notes = notes;
      if (updateLogo) updates.logoId = logoId;
      onSave(updates);
  };

  return (
      <Modal title={t.modalBatchEditTitle} onClose={onClose}>
          <div className="space-y-4 pb-10">
              <div className="flex gap-2 items-end">
                  <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2 cursor-pointer w-fit">
                          <input type="checkbox" checked={updateIssuer} onChange={e => setUpdateIssuer(e.target.checked)} className={`rounded ${theme.checkbox}`} />
                          {t.labelIssuer}
                      </label>
                      <input 
                          type="text" 
                          disabled={!updateIssuer}
                          className={`w-full p-2 text-sm border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none disabled:bg-gray-100 disabled:text-gray-400 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-600`}
                          value={issuer} 
                          onChange={e => setIssuer(e.target.value)} 
                          placeholder={!updateIssuer ? "(No Change)" : ""}
                      />
                  </div>
              </div>
              <div className="flex gap-2 items-end">
                  <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2 cursor-pointer w-fit">
                          <input type="checkbox" checked={updateAccount} onChange={e => setUpdateAccount(e.target.checked)} className={`rounded ${theme.checkbox}`} />
                          {t.labelAccount}
                      </label>
                      <input 
                          type="text" 
                          disabled={!updateAccount}
                          className={`w-full p-2 text-sm border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none disabled:bg-gray-100 disabled:text-gray-400 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-600`}
                          value={account} 
                          onChange={e => setAccount(e.target.value)} 
                          placeholder={!updateAccount ? "(No Change)" : ""}
                      />
                  </div>
              </div>
              <div className="flex gap-2 items-end">
                  <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2 cursor-pointer w-fit">
                          <input type="checkbox" checked={updateNotes} onChange={e => setUpdateNotes(e.target.checked)} className={`rounded ${theme.checkbox}`} />
                          {t.labelNotes}
                      </label>
                      <input 
                          type="text" 
                          disabled={!updateNotes}
                          className={`w-full p-2 text-sm border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none disabled:bg-gray-100 disabled:text-gray-400 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800 dark:disabled:text-gray-600`}
                          value={notes} 
                          onChange={e => setNotes(e.target.value)} 
                          placeholder={!updateNotes ? "(No Change)" : ""}
                      />
                  </div>
              </div>
              <div className="flex gap-2 items-end">
                  <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2 cursor-pointer w-fit">
                          <input type="checkbox" checked={updateLogo} onChange={e => setUpdateLogo(e.target.checked)} className={`rounded ${theme.checkbox}`} />
                          {t.labelLogo}
                      </label>
                      <div className={!updateLogo ? 'opacity-50 pointer-events-none' : ''}>
                        <LogoSelect 
                            logos={logos}
                            value={logoId}
                            onChange={(val) => setLogoId(val)}
                            placeholder={!updateLogo ? "(No Change)" : "Select Logo"}
                            color={color}
                        />
                      </div>
                  </div>
              </div>
             <button onClick={handleSave} className={`w-full ${theme.btn} text-white py-2 rounded-lg font-medium mt-4 text-sm`}>
                {t.btnSave}
             </button>
          </div>
      </Modal>
  )
};

interface BatchImportModalProps {
    onClose: () => void;
    onPreview: (candidates: ImportCandidate[]) => void;
    color?: 'blue' | 'orange' | 'emerald';
}

export const BatchImportModal: React.FC<BatchImportModalProps> = ({ onClose, onPreview, color = 'blue' }) => {
  const { t } = useContext(LanguageContext);
  const theme = getTheme(color);
  const [tab, setTab] = useState<'paste' | 'qr'>('paste');
  const [text, setText] = useState('');
  const [separator, setSeparator] = useState(',');
  const [loading, setLoading] = useState(false);

  const handlePreview = () => {
    if (text.trim().startsWith('otpauth-migration://')) {
        try {
            const migrationAccounts = parseMigrationURI(text.trim());
            const candidates: ImportCandidate[] = migrationAccounts.map(acc => ({
                raw: 'otpauth-migration import',
                issuer: acc.issuer,
                account: acc.name,
                secret: acc.secret,
                period: 30, 
                isValid: true,
                notes: 'Imported via Migration Package'
            }));
            onPreview(candidates);
            return;
        } catch (e) {
            console.error(e);
            alert("Failed to parse migration URI");
            return;
        }
    }
    const lines = text.split('\n');
    const candidates: ImportCandidate[] = [];
    for (const line of lines) {
        const candidate = parseLine(line, separator);
        if (candidate.secret === 'MIGRATION_BLOB' && candidate.raw.startsWith('otpauth-migration://')) {
             try {
                 const expanded = parseMigrationURI(candidate.raw);
                 expanded.forEach(acc => candidates.push({
                    raw: 'Expanded from Migration URI',
                    issuer: acc.issuer,
                    account: acc.name,
                    secret: acc.secret,
                    period: 30,
                    isValid: true
                 }));
             } catch(err) { candidates.push(candidate); }
        } else candidates.push(candidate);
    }
    onPreview(candidates.filter(c => c.raw.trim().length > 0));
  };

  const handleQRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setLoading(true);
      const files = Array.from(e.target.files) as File[];
      const candidates: ImportCandidate[] = [];
      for (const file of files) {
        try {
          const qrData = await decodeQRFromImage(file);
          if (qrData) {
            if (qrData.startsWith('otpauth-migration://')) {
                try {
                    const migrationAccounts = parseMigrationURI(qrData);
                    migrationAccounts.forEach(acc => {
                        candidates.push({
                            raw: 'otpauth-migration import',
                            issuer: acc.issuer,
                            account: acc.name,
                            secret: acc.secret,
                            period: 30,
                            isValid: true,
                            notes: 'Imported via Migration Package'
                        });
                    });
                } catch (e) {
                    candidates.push({ raw: file.name, issuer: 'Error', account: 'Migration Parse Error', secret: '', period: 0, isValid: false });
                }
            } else {
                const parsed = parseLine(qrData);
                if (parsed.isValid) candidates.push(parsed);
                else candidates.push({ raw: file.name, issuer: 'Error', account: 'Invalid QR', secret: '', period: 0, isValid: false, notes: 'Could not parse QR data' });
            }
          } else candidates.push({ raw: file.name, issuer: 'Error', account: 'No QR found', secret: '', period: 0, isValid: false });
        } catch (err) { candidates.push({ raw: file.name, issuer: 'Error', account: 'Read Error', secret: '', period: 0, isValid: false }); }
      }
      setLoading(false);
      onPreview(candidates);
    }
  };

  return (
    <Modal title={t.modalImportTitle} onClose={onClose}>
        <div className="flex gap-4 mb-4 border-b dark:border-gray-700">
            <button className={`pb-2 px-1 font-medium text-sm transition ${tab === 'paste' ? `${theme.text} border-b-2 ${theme.border}` : 'text-gray-500 dark:text-gray-400'}`} onClick={() => setTab('paste')}>
              {t.textPaste}
            </button>
            <button className={`pb-2 px-1 font-medium text-sm transition ${tab === 'qr' ? `${theme.text} border-b-2 ${theme.border}` : 'text-gray-500 dark:text-gray-400'}`} onClick={() => setTab('qr')}>
              {t.btnUploadQR}
            </button>
        </div>
        {tab === 'paste' ? (
            <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t.textPaste} <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">CSV, URI, or Migration URL</span></p>
                <textarea className={`w-full h-40 p-3 text-sm border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white`} value={text} onChange={e => setText(e.target.value)} placeholder={`Issuer, Account, Secret, Period, Notes, LogoID\notpauth-migration://offline?data=...`} />
                 <div className="flex justify-between items-center">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.labelSeparator}</label>
                        <input type="text" className={`w-20 p-2 text-sm border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none text-center font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white`} value={separator} onChange={e => setSeparator(e.target.value)} maxLength={1} />
                    </div>
                 </div>
                 <button onClick={handlePreview} disabled={!text.trim()} className={`w-full ${theme.btn} text-white py-2 rounded-lg font-medium mt-2 text-sm`}>{t.btnPreview}</button>
            </div>
        ) : (
            <div className="space-y-8 py-8 text-center">
                 <div className="mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                     <ImageIcon size={24} className="text-gray-400 dark:text-gray-300" />
                 </div>
                 <div>
                     <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">{t.btnUploadQR}</p>
                     <label className={`${theme.btn} text-white px-5 py-2.5 rounded-lg font-medium cursor-pointer inline-flex items-center gap-2 hover:shadow-lg transition text-sm`}>
                         <Upload size={16} />
                         {loading ? 'Processing...' : 'Select Images'}
                         <input type="file" multiple accept="image/*" className="hidden" onChange={handleQRUpload} disabled={loading} />
                     </label>
                 </div>
                 <p className="text-[10px] text-gray-400">Supports Standard & Migration QRs</p>
            </div>
        )}
    </Modal>
  );
};

interface ImportPreviewModalProps {
    isOpen: boolean;
    candidates: ImportCandidate[];
    onClose: () => void;
    onConfirm: (candidates: ImportCandidate[]) => void;
    logos: AppLogo[];
    color?: 'blue' | 'orange' | 'emerald';
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({ isOpen, candidates, onClose, onConfirm, logos, color = 'blue' }) => {
    const { t } = useContext(LanguageContext);
    const theme = getTheme(color);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    useEffect(() => {
        if (isOpen && candidates.length > 0) {
            const validIndices = candidates.map((c, i) => c.isValid ? i : -1).filter(i => i !== -1);
            setSelectedIndices(new Set(validIndices));
        }
    }, [isOpen, candidates]);
    if (!isOpen) return null;
    const handleConfirm = () => {
        const toImport = candidates.filter((_, i) => selectedIndices.has(i));
        onConfirm(toImport);
    };
    const toggleSelect = (index: number) => {
        const next = new Set(selectedIndices);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        setSelectedIndices(next);
    };
    const getAvatarColor = (name: string) => {
        const colors = ['bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300', 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300', 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300', 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300', 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300'];
        const index = name.length % colors.length;
        return colors[index];
    };
    return (
        <Modal title={`${t.headerImport} (${candidates.length})`} onClose={onClose} className="max-w-2xl">
            <div className="flex flex-col h-full max-h-[70vh]">
                <div className="flex justify-between items-center mb-4 px-1"><p className="text-xs text-gray-500 dark:text-gray-400">{selectedIndices.size} selected</p></div>
                <div className="overflow-y-auto flex-1 bg-gray-50 dark:bg-gray-900/50 rounded-lg border dark:border-gray-700">
                    {candidates.map((c, i) => {
                         const logo = c.logoId ? logos.find(l => String(l.id) === String(c.logoId)) : null;
                         const avatarClass = getAvatarColor(c.issuer || 'U');
                         return (
                            <div key={i} className={`flex items-start gap-3 p-3 border-b dark:border-gray-700 bg-white dark:bg-gray-800 last:border-b-0 ${!c.isValid ? 'opacity-50' : 'cursor-pointer'}`} onClick={() => c.isValid && toggleSelect(i)}>
                                <div className="pt-1"><input type="checkbox" checked={selectedIndices.has(i)} onChange={() => {}} disabled={!c.isValid} className={`w-4 h-4 rounded border-gray-300 ${theme.checkbox}`} /></div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                                            {logo ? <div className="w-6 h-6 shrink-0 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded p-0.5"><img src={logo.data} alt={logo.name} className="w-full h-full object-contain" /></div> : <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 ${avatarClass}`}>{(c.issuer || '?').charAt(0).toUpperCase()}</div>}
                                           <span className="font-bold text-sm text-gray-900 dark:text-white truncate">{c.issuer || 'Unknown'}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-mono shrink-0 ml-2">{c.period}s</span>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5 ml-8.5">{c.account}</p>
                                    <div className="mt-1 flex items-center gap-2 ml-8.5 overflow-hidden">
                                        <span className="text-[10px] text-gray-400 font-mono truncate max-w-[120px]" title={c.secret}>{c.secret ? c.secret.substring(0, 4) + '...' + c.secret.substring(c.secret.length-4) : 'NO SECRET'}</span>
                                        {c.notes && <span className="text-[10px] text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded truncate max-w-[150px] border border-blue-100 dark:border-blue-800" title={c.notes}>{c.notes}</span>}
                                        {c.logoId && !logo && <span className="text-[9px] text-orange-400 border border-orange-100 dark:border-orange-900/50 px-1 rounded">ID: {c.logoId}</span>}
                                        {!c.isValid && <span className="text-[10px] text-red-500 bg-red-50 px-1 rounded">Invalid</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="pt-4 mt-4 border-t dark:border-gray-700 flex justify-end gap-3"><button onClick={onClose} className="px-3 py-2 border dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium">{t.btnCancel}</button><button onClick={handleConfirm} disabled={selectedIndices.size === 0} className={`${theme.btn} text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm disabled:opacity-50`}>{t.btnImport} ({selectedIndices.size})</button></div>
            </div>
        </Modal>
    )
}

interface LogoManagerModalProps {
  onClose: () => void;
  logos: AppLogo[];
  onAddLogo: (logo: AppLogo) => void;
  onDeleteLogo: (id: string) => void;
  onBatchDeleteLogo: (ids: string[]) => void;
  onImportLogos: (logos: AppLogo[]) => void;
  inline?: boolean;
  color?: 'blue' | 'orange' | 'emerald';
}

export const LogoManagerModal: React.FC<LogoManagerModalProps> = ({ 
    onClose, logos, onAddLogo, onDeleteLogo, onBatchDeleteLogo, onImportLogos, inline = false, color = 'blue' 
}) => {
  const { t } = useContext(LanguageContext);
  const theme = getTheme(color);
  const [tab, setTab] = useState<'list' | 'add' | 'import'>('list');
  const [newLogoName, setNewLogoName] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importCandidates, setImportCandidates] = useState<AppLogo[]>([]);
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set());
  useEffect(() => { setSelectedIds(new Set()); }, [tab]);
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => { if (ev.target?.result) setNewLogoUrl(ev.target.result as string); };
          reader.readAsDataURL(file);
      }
  };
  const handleAdd = () => {
      if (newLogoName && newLogoUrl) {
          onAddLogo({ id: uuidv4(), name: newLogoName, data: newLogoUrl });
          setNewLogoName(''); setNewLogoUrl(''); setTab('list');
      }
  };
  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (ev.target?.result) {
                try {
                    const parsed = JSON.parse(ev.target.result as string);
                    if (Array.isArray(parsed)) {
                        const valid = parsed.filter(item => item.name && item.data);
                        const candidates = valid.map((l: any) => ({...l, id: l.id ? String(l.id) : uuidv4() }));
                        setImportCandidates(candidates);
                        setSelectedImportIds(new Set(candidates.map((c: any) => String(c.id))));
                    } else alert("Invalid JSON Format.");
                } catch (e) { alert("Invalid JSON File."); }
            }
        };
        reader.readAsText(file);
        e.target.value = ''; 
    }
  };
  const handleConfirmImport = () => {
      const toImport = importCandidates.filter(c => selectedImportIds.has(String(c.id)));
      if (toImport.length === 0) return;
      onImportLogos(toImport);
      setImportCandidates([]); setTab('list');
  };
  const handleClearImport = () => { setImportCandidates([]); setSelectedImportIds(new Set()); };
  const toggleImportSelect = (id: string) => {
      const next = new Set(selectedImportIds);
      const sid = String(id);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      setSelectedImportIds(next);
  };
  const toggleImportSelectAll = () => {
      if (selectedImportIds.size === importCandidates.length) setSelectedImportIds(new Set());
      else setSelectedImportIds(new Set(importCandidates.map(c => String(c.id))));
  };
  const handleExportSelected = () => {
      if (selectedIds.size === 0) return;
      const selectedLogos = logos.filter(l => selectedIds.has(String(l.id)));
      const json = JSON.stringify(selectedLogos, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'logos-export.json'; a.click(); URL.revokeObjectURL(url);
  };
  const handleExportAll = () => {
      const json = JSON.stringify(logos, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'logos-full.json'; a.click(); URL.revokeObjectURL(url);
  };
  const toggleSelect = (id: string) => {
      const next = new Set(selectedIds);
      const sid = String(id);
      if (next.has(sid)) next.delete(sid); else next.add(sid);
      setSelectedIds(next);
  };
  const toggleSelectAll = () => {
      if (selectedIds.size === logos.length) setSelectedIds(new Set());
      else setSelectedIds(new Set(logos.map(l => String(l.id))));
  };
  const handleDeleteSelected = () => { if (confirm(`Delete ${selectedIds.size} selected logos?`)) { onBatchDeleteLogo(Array.from(selectedIds)); setSelectedIds(new Set()); } };
  const content = (
      <div className={`flex flex-col relative ${inline ? '' : 'h-full'}`}>
          <div className="flex gap-4 mb-4 border-b dark:border-gray-700 shrink-0 items-center justify-between">
            <div className="flex gap-4">
                <button className={`pb-2 px-1 font-medium text-sm transition ${tab === 'list' ? `${theme.text} border-b-2 ${theme.border}` : 'text-gray-500 dark:text-gray-400'}`} onClick={() => setTab('list')}>{t.tabLogoList}</button>
                <button className={`pb-2 px-1 font-medium text-sm transition ${tab === 'add' ? `${theme.text} border-b-2 ${theme.border}` : 'text-gray-500 dark:text-gray-400'}`} onClick={() => setTab('add')}>{t.tabAddLogo}</button>
                <button className={`pb-2 px-1 font-medium text-sm transition ${tab === 'import' ? `${theme.text} border-b-2 ${theme.border}` : 'text-gray-500 dark:text-gray-400'}`} onClick={() => setTab('import')}>{t.tabImportLogos}</button>
            </div>
            {tab === 'list' && logos.length > 0 && (
                 <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer pb-2"><input type="checkbox" checked={selectedIds.size === logos.length} onChange={toggleSelectAll} className={`rounded ${theme.checkbox}`} />{t.selectAll}</label>
            )}
            {tab === 'import' && importCandidates.length > 0 && (
                 <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer pb-2"><input type="checkbox" checked={selectedImportIds.size === importCandidates.length} onChange={toggleImportSelectAll} className={`rounded ${theme.checkbox}`} />{t.selectAll}</label>
            )}
          </div>
          <div className={`${inline ? '' : 'flex-1 overflow-y-auto min-h-[300px]'} ${(selectedIds.size > 0 && tab === 'list') || (importCandidates.length > 0 && tab === 'import') ? 'pb-20' : 'pb-4'}`}>
              {tab === 'list' && (
                  <div className="space-y-4">
                      {logos.length === 0 && <p className="text-gray-500 text-center py-10">No custom logos.</p>}
                      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                          {logos.map(l => {
                              const sid = String(l.id);
                              const isSelected = selectedIds.has(sid);
                              return (
                                  <div key={sid} onClick={() => toggleSelect(sid)} className={`aspect-square border dark:border-gray-600 rounded-lg p-1 relative group cursor-pointer transition flex flex-col items-center justify-center bg-white dark:bg-gray-700 ${isSelected ? `ring-2 ${theme.selectionRing} ${theme.selectionBorder}` : 'hover:shadow-md'}`}>
                                      <div className={`absolute top-1 right-1 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}><div className={`w-3 h-3 rounded flex items-center justify-center ${isSelected ? `${theme.checkBg} text-white` : 'border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600'}`}>{isSelected && <Check size={8} />}</div></div>
                                      <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center mb-1"><img src={l.data} alt={l.name} className="max-w-full max-h-full object-contain" /></div>
                                      <p className="text-[8px] text-center font-medium truncate w-full px-1 text-gray-700 dark:text-gray-200" title={l.name}>{l.name}</p>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}
              {tab === 'add' && (
                  <div className="space-y-4 max-w-md mx-auto py-4">
                       <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.labelLogoName}</label><input type="text" className={`w-full p-2 text-sm border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white`} value={newLogoName} onChange={e => setNewLogoName(e.target.value)} /></div>
                       <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.labelLogoUrl}</label><input type="text" className={`w-full p-2 text-sm border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white`} value={newLogoUrl} onChange={e => setNewLogoUrl(e.target.value)} placeholder="https://..." /></div>
                       <div className="text-center text-xs text-gray-500 py-1">- OR -</div>
                       <div><label className={`flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 cursor-pointer hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition`}><Upload size={16} className="text-gray-400" /><span className="text-gray-600 dark:text-gray-300 text-sm">{t.btnUploadLogo}</span><input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} /></label></div>
                       {newLogoUrl && <div className="mt-4 flex justify-center"><img src={newLogoUrl} alt="Preview" className="h-16 object-contain border rounded p-1" /></div>}
                       <button onClick={handleAdd} disabled={!newLogoName || !newLogoUrl} className={`w-full ${theme.btn} text-white py-2 rounded-lg font-medium mt-4 text-sm disabled:opacity-50`}>{t.btnAddLogo}</button>
                  </div>
              )}
              {tab === 'import' && (
                  <div className="space-y-4">
                      {importCandidates.length === 0 ? (
                          <><div className="flex gap-4"><button onClick={handleExportAll} className="flex-1 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"><Download size={14} /> {t.btnExportLogos}</button></div><div className="py-4"><label className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition cursor-pointer block"><FileJson className="mx-auto h-8 w-8 text-gray-400 mb-2" /><p className="text-sm font-medium text-gray-700 dark:text-gray-200">Import Logos</p><input type="file" accept=".json,application/json" className="hidden" onChange={handleImportFileSelect} /></label></div></>
                      ) : (
                          <div>
                              <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                                  {importCandidates.map(l => {
                                      const sid = String(l.id);
                                      const isSelected = selectedImportIds.has(sid);
                                      return (
                                          <div key={sid} onClick={() => toggleImportSelect(sid)} className={`aspect-square border dark:border-gray-600 rounded-lg p-1 relative group cursor-pointer transition flex flex-col items-center justify-center bg-white dark:bg-gray-700 ${isSelected ? `ring-2 ${theme.selectionRing} ${theme.selectionBorder}` : 'hover:shadow-md'}`}><div className={`absolute top-1 right-1`}><div className={`w-3 h-3 rounded flex items-center justify-center ${isSelected ? `${theme.checkBg} text-white` : 'border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600'}`}>{isSelected && <Check size={8} />}</div></div><div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center mb-1"><img src={l.data} alt={l.name} className="max-w-full max-h-full object-contain" /></div><p className="text-[8px] text-center font-medium truncate w-full px-1 text-gray-700 dark:text-gray-200">{l.name}</p></div>
                                      );
                                  })}
                              </div>
                          </div>
                      )}
                  </div>
              )}
          </div>
          {(selectedIds.size > 0 && tab === 'list') && (
              <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6_rgba(0,0,0,0.1)] p-3 z-[60] animate-in slide-in-from-bottom duration-300"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-3"><div className="w-full sm:w-auto flex justify-between sm:justify-start items-center"><span className="font-semibold text-gray-700 dark:text-gray-200 ml-1 text-sm">{selectedIds.size} {t.selected}</span></div><div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:gap-2"><button onClick={handleExportSelected} className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg transition text-xs font-medium"><Download size={14} /> {t.exportSelected}</button><button onClick={handleDeleteSelected} className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg transition text-xs font-medium"><Trash2 size={14} /> {t.deleteSelected}</button></div></div></div>
          )}
          {(importCandidates.length > 0 && tab === 'import') && (
              <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6_rgba(0,0,0,0.1)] p-3 z-[60] animate-in slide-in-from-bottom duration-300"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-3"><div className="w-full sm:w-auto flex justify-between sm:justify-start items-center"><span className="font-semibold text-gray-700 dark:text-gray-200 ml-1 text-sm">{selectedImportIds.size} {t.selected}</span></div><div className="flex gap-2 w-full sm:w-auto"><button onClick={handleClearImport} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg transition text-xs font-medium">{t.btnCancel}</button><button onClick={handleConfirmImport} disabled={selectedImportIds.size === 0} className={`flex-[2] sm:flex-none flex items-center justify-center gap-2 ${theme.btn} text-white px-5 py-2 rounded-lg transition text-xs font-medium disabled:opacity-50`}><Download size={14} /> {t.btnImportLogos}</button></div></div></div>
          )}
      </div>
  );
  if (inline) return content;
  return (<Modal title={t.modalLogoManagerTitle} onClose={onClose} className="max-w-2xl">{content}</Modal>);
};

interface BatchExportModalProps {
  accounts: OTPAccount[];
  onClose: () => void;
  color?: 'blue' | 'orange' | 'emerald';
}

export const BatchExportModal: React.FC<BatchExportModalProps> = ({ accounts, onClose, color = 'blue' }) => {
  const { t } = useContext(LanguageContext);
  const theme = getTheme(color);
  const [tab, setTab] = useState<'csv' | 'uri' | 'migration'>('csv');
  const [includeLogo, setIncludeLogo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [accountsPerQR, setAccountsPerQR] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const getCSV = () => accounts.map(acc => `${acc.issuer},${acc.account},${acc.secret},${acc.period},${acc.notes || ''}${includeLogo ? `,${acc.logoId || ''}` : ''}`).join('\n');
  const getURIs = () => accounts.map(acc => `otpauth://totp/${encodeURIComponent(acc.issuer)}:${encodeURIComponent(acc.account)}?secret=${acc.secret}&issuer=${encodeURIComponent(acc.issuer)}&period=${acc.period}`).join('\n');
  const totalPages = Math.ceil(accounts.length / accountsPerQR);
  const currentBatch = accounts.slice(currentPage * accountsPerQR, (currentPage + 1) * accountsPerQR);
  const getMigrationURI = (batch: OTPAccount[]) => {
    const libAccounts = batch.map(acc => ({ secret: acc.secret, name: acc.account, issuer: acc.issuer, algorithm: Algorithm.SHA1, digits: DigitCount.SIX, type: OtpType.TOTP, counter: 0 }));
    return generateMigrationURI(libAccounts);
  };
  const currentMigrationURI = getMigrationURI(currentBatch);
  const contentToCopy = tab === 'csv' ? getCSV() : (tab === 'uri' ? getURIs() : currentMigrationURI);
  const handleCopy = () => { navigator.clipboard.writeText(contentToCopy); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  useEffect(() => { setCurrentPage(0); }, [accountsPerQR]);
  return (
    <Modal title={`${t.modalExportTitle} (${accounts.length})`} onClose={onClose} className="max-w-4xl">
       <div className="flex gap-4 mb-4 border-b dark:border-gray-700"><button className={`pb-2 px-1 font-medium text-sm transition ${tab === 'csv' ? `${theme.text} border-b-2 ${theme.border}` : 'text-gray-500 dark:text-gray-400'}`} onClick={() => setTab('csv')}>{t.tabCSV}</button><button className={`pb-2 px-1 font-medium text-sm transition ${tab === 'uri' ? `${theme.text} border-b-2 ${theme.border}` : 'text-gray-500 dark:text-gray-400'}`} onClick={() => setTab('uri')}>URI List</button><button className={`pb-2 px-1 font-medium text-sm transition ${tab === 'migration' ? `${theme.text} border-b-2 ${theme.border}` : 'text-gray-500 dark:text-gray-400'}`} onClick={() => setTab('migration')}>Migration QR</button></div>
       {tab !== 'migration' ? (
         <div className="space-y-4">
            <div className="flex justify-between items-center"><p className="text-sm text-gray-500 dark:text-gray-400">{tab === 'csv' ? t.descCSV : "Standard otpauth URIs"}</p>{tab === 'csv' && (<label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer"><input type="checkbox" checked={includeLogo} onChange={e => setIncludeLogo(e.target.checked)} className={`rounded ${theme.checkbox}`} />{t.labelIncludeLogo}</label>)}</div>
            <textarea readOnly className={`w-full h-60 p-3 text-xs border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none font-mono bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white whitespace-pre`} value={contentToCopy}/>
            <button onClick={handleCopy} className={`w-full ${theme.btn} text-white py-2 rounded-lg font-medium mt-2 text-sm flex items-center justify-center gap-2`}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? t.copied : t.btnCopy}</button>
         </div>
       ) : (
         <div className="space-y-6 flex flex-col items-center py-2">
             <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border dark:border-gray-700">
                <div className="flex items-center gap-3"><div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700"><Layers size={18} className={theme.text} /></div><div><p className="text-xs font-bold text-gray-700 dark:text-gray-200">Group Size</p><select className="bg-transparent text-xs text-gray-500 focus:outline-none cursor-pointer font-medium" value={accountsPerQR} onChange={(e) => setAccountsPerQR(Number(e.target.value))}><option value={1}>1 Account</option><option value={5}>5 Accounts</option><option value={10}>10 Accounts</option><option value={15}>15 Accounts</option><option value={20}>20 Accounts</option></select></div></div>
                <div className="flex items-center gap-2"><button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 transition"><ChevronLeft size={16} /></button><span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-1 rounded-md border dark:border-gray-700">{currentPage + 1} / {totalPages}</span><button disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 transition"><ChevronRight size={16} /></button></div>
             </div>
             <div className="text-center max-w-sm"><p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-1">Google Authenticator Migration QR</p><p className="text-xs text-gray-500 dark:text-gray-400">Page {currentPage + 1}: contains {currentBatch.length} accounts.</p></div>
             <div className="bg-white p-4 rounded-2xl border-[10px] border-gray-100 shadow-2xl"><QRCodeSVG value={currentMigrationURI} size={250} level="M" /></div>
             <div className="w-full space-y-2"><label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-gray-500 ml-1">Migration URL (Page {currentPage + 1})</label><div className="flex gap-2"><div className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-lg p-3 font-mono text-[10px] break-all max-h-24 overflow-y-auto text-gray-600 dark:text-gray-300 leading-relaxed scrollbar-thin">{currentMigrationURI}</div><button onClick={handleCopy} className={`shrink-0 p-3 ${theme.btn} text-white rounded-lg shadow-lg hover:shadow-xl transition-all self-end`} title="Copy Current URL">{copied ? <Check size={18} /> : <Copy size={18} />}</button></div>{copied && <p className="text-[10px] text-green-500 font-bold animate-in fade-in slide-in-from-left-1">Copied to clipboard!</p>}</div>
         </div>
       )}
    </Modal>
  );
};

interface PasswordSettingsModalProps {
  onClose: () => void;
  hasPassword: boolean;
  onSetPassword: (password: string) => Promise<void | boolean>;
  onRemovePassword: (password: string) => Promise<boolean>;
  onChangePassword?: (oldPass: string, newPass: string) => Promise<boolean>;
  color?: 'blue' | 'orange' | 'emerald';
  isUnlock?: boolean; 
  titleSuffix?: string;
  isAppSecurity?: boolean;
}

export const PasswordSettingsModal: React.FC<PasswordSettingsModalProps> = ({ 
    onClose, hasPassword, onSetPassword, onRemovePassword, onChangePassword, color = 'blue', isUnlock = false, titleSuffix = "", isAppSecurity = false
}) => {
  const { t } = useContext(LanguageContext);
  const theme = getTheme(color);
  const [view, setView] = useState<'menu' | 'set' | 'remove' | 'change'>(isUnlock ? 'set' : (hasPassword ? 'menu' : 'set'));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setPassword(''); setConfirmPassword(''); setCurrentPassword(''); setError(''); }, [view]);
  const handleSet = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isUnlock && password !== confirmPassword) { setError(t.passwordsNoMatch); return; }
      try { await onSetPassword(password); if (!isUnlock) onClose(); } catch (err) { setError(t.wrongPassword); }
  };
  const handleRemove = async (e: React.FormEvent) => {
      e.preventDefault();
      const success = await onRemovePassword(currentPassword);
      if (success) onClose(); else setError(t.wrongPassword);
  };
  const handleChange = async (e: React.FormEvent) => {
      e.preventDefault();
      if (password !== confirmPassword) { setError(t.passwordsNoMatch); return; }
      if (onChangePassword) { const success = await onChangePassword(currentPassword, password); if (success) onClose(); else setError(t.wrongPassword); }
  };
  let title = isAppSecurity ? t.securityTitle : t.fileSecurityTitle;
  if (isUnlock) title = t.unlockFile;
  else if (!hasPassword) title = t.setPassword;
  if (titleSuffix) title += ` - ${titleSuffix}`;
  return (
      <Modal title={title} onClose={onClose} className="max-w-md">
          {view === 'menu' && (
              <div className="space-y-3 py-4">
                  <div className={`flex items-center justify-center mb-6 ${theme.icon}`}><ShieldCheck size={48} /></div>
                  <button onClick={() => setView('change')} className={`w-full border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-lg font-medium flex items-center justify-center gap-2`}><KeyRound size={18} /> {t.changePassword}</button>
                  <button onClick={() => setView('remove')} className={`w-full border border-red-200 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 py-3 rounded-lg font-medium flex items-center justify-center gap-2`}><ShieldOff size={18} /> {t.removePassword}</button>
              </div>
          )}
          {view === 'set' && (
              <form onSubmit={handleSet} className="space-y-4 py-2">
                  <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{isUnlock ? t.enterPassword : t.setPassword}</label><input type="password" autoFocus className={`w-full p-2 text-sm border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white`} value={password} onChange={e => setPassword(e.target.value)} /></div>
                  {!isUnlock && (<div><label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.confirmPassword}</label><input type="password" className={`w-full p-2 text-sm border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white`} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div>)}
                  {error && <p className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle size={12} /> {error}</p>}
                  <button type="submit" className={`w-full ${theme.btn} text-white py-2 rounded-lg font-medium mt-2 text-sm`}>{isUnlock ? t.unlock : t.setPassword}</button>
              </form>
          )}
          {view === 'remove' && (
              <form onSubmit={handleRemove} className="space-y-4 py-2">
                  <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.enterPassword}</label><input type="password" autoFocus className={`w-full p-2 text-sm border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white`} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></div>
                  {error && <p className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle size={12} /> {error}</p>}
                  <div className="flex gap-2"><button type="button" onClick={() => setView('menu')} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium">{t.btnCancel}</button><button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium text-sm">{t.removePassword}</button></div>
              </form>
          )}
          {view === 'change' && (
              <form onSubmit={handleChange} className="space-y-4 py-2">
                  <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label><input type="password" autoFocus className={`w-full p-2 text-sm border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white`} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></div>
                  <div className="border-t dark:border-gray-700 my-2"></div>
                  <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label><input type="password" className={`w-full p-2 text-sm border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white`} value={password} onChange={e => setPassword(e.target.value)} /></div>
                  <div><label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.confirmPassword}</label><input type="password" className={`w-full p-2 text-sm border dark:border-gray-600 rounded-lg focus:ring-2 ${theme.ring} outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white`} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></div>
                  {error && <p className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle size={12} /> {error}</p>}
                  <div className="flex gap-2"><button type="button" onClick={() => setView('menu')} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium">{t.btnCancel}</button><button type="submit" className={`flex-1 ${theme.btn} text-white py-2 rounded-lg font-medium text-sm`}>{t.changePassword}</button></div>
              </form>
          )}
      </Modal>
  );
};