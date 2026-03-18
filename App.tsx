import React, { useState, useEffect, useRef } from 'react';
import { StorageMode, OTPAccount, ImportCandidate, AppLogo, FileSpace } from './types';
import AccountCard from './components/AccountCard';
import { AccountFormModal, BatchImportModal, BatchExportModal, ImportPreviewModal, LogoManagerModal, BatchEditModal, PasswordSettingsModal } from './components/Modals';
import LockScreen from './components/LockScreen';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { Plus, Upload, Download, HardDrive, Zap, Lock, ShieldCheck, Languages, Trash2, CheckSquare, Square, Search, Image as ImageIcon, Edit2, ShieldAlert, QrCode, X, FileJson, FolderOpen, Save, FilePlus, PenLine, XCircle, Unlock, AlertTriangle, Sun, Moon, Monitor, StickyNote, Info, Settings, MoreVertical } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { LanguageContext, translations, Language } from './utils/i18n';
import { encryptData, decryptData, hashPassword, generateSalt } from './utils/crypto';
import fileSystemClient, { FileSystemFileHandle } from './service/FileSystemClient';
import { handleStore } from './utils/db';

const STORAGE_KEYS = {
  local: 'secure_auth_local_data',
  session: 'secure_auth_session_data',
  customLogos: 'secure_auth_custom_logos',
  lang: 'secure_auth_lang',
  passwordHash: 'secure_auth_password_hash',
  salt: 'secure_auth_salt',
  theme: 'secure_auth_theme',
  fileSpaces: 'secure_auth_file_spaces',
  activeTab: 'secure_auth_active_tab',
  sessionMasterKey: 'secure_auth_temp_master_key',
  sessionFileKeyPrefix: 'secure_auth_temp_file_key_'
};

interface PendingFile {
    space: FileSpace;
    rawEncryptedData: {
        isEncrypted: boolean;
        data: string;
        salt: string;
    }
}

type Theme = 'light' | 'dark' | 'system';

interface ContextMenu {
    x: number;
    y: number;
    fileId: string;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<StorageMode>(() => {
      try {
          return (localStorage.getItem(STORAGE_KEYS.activeTab) as StorageMode) || 'local';
      } catch {
          return 'local';
      }
  });
  
  const [accounts, setAccounts] = useState<OTPAccount[]>([]);
  const [isLocked, setIsLocked] = useState(true); 
  const [hasPassword, setHasPassword] = useState(false);
  const [sessionKey, setSessionKey] = useState<string | null>(null); 
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordTargetFileId, setPasswordTargetFileId] = useState<string | null>(null);

  const [openFiles, setOpenFiles] = useState<FileSpace[]>([]);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [showFileUnlockModal, setShowFileUnlockModal] = useState(false);

  const [showInfo, setShowInfo] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  /**
   * 全局 UI 主题色：
   * 本地文件模式：固定绿色 (Emerald)
   * 临时会话模式：固定橙色 (Orange)
   * 本地存储模式：固定蓝色 (Blue)
   */
  const themeColor = activeTab === 'file' ? 'emerald' : (activeTab === 'session' ? 'orange' : 'blue');
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [visibleQRIds, setVisibleQRIds] = useState<Set<string>>(new Set());
  const [editingAccount, setEditingAccount] = useState<OTPAccount | undefined>(undefined);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importCandidates, setImportCandidates] = useState<ImportCandidate[]>([]);
  const [customLogos, setCustomLogos] = useState<AppLogo[]>([]);
  const [showLogoManager, setShowLogoManager] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
      const id = uuidv4();
      setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
      setToasts(prev => prev.filter(t => t.id !== id));
  };

  const [lang, setLang] = useState<Language>(() => {
      try {
          return (localStorage.getItem(STORAGE_KEYS.lang) as Language) || 'en';
      } catch {
          return 'en';
      }
  });

  const t = translations[lang];

  const modeTitle = activeTab === 'local' ? t.bannerLocalTitle : (activeTab === 'file' ? t.bannerFileTitle : t.bannerSessionTitle);
  const modeDesc = activeTab === 'local' ? t.bannerLocalDesc : (activeTab === 'file' ? t.bannerFileDesc : t.bannerSessionDesc);

  const [theme, setTheme] = useState<Theme>(() => {
      try {
          return (localStorage.getItem(STORAGE_KEYS.theme) as Theme) || 'system';
      } catch {
          return 'system';
      }
  });
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettingsDropdown(false);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.activeTab, activeTab);
  }, [activeTab]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (theme === 'dark' || (theme === 'system' && systemDark)) {
        root.classList.add('dark');
    } else {
        root.classList.add('light');
    }
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.lang, lang);
  }, [lang]);

  useEffect(() => {
    const loadPersistedFileSpaces = async () => {
        const storedMetadata = localStorage.getItem(STORAGE_KEYS.fileSpaces);
        if (storedMetadata) {
            try {
                const metadata: FileSpace[] = JSON.parse(storedMetadata);
                const restoredSpaces = await Promise.all(metadata.map(async (space) => {
                    const handle = space.isVirtual ? null : await handleStore.get(space.id);
                    const sessionPassword = sessionStorage.getItem(STORAGE_KEYS.sessionFileKeyPrefix + space.id);
                    
                    return {
                        ...space,
                        handle: handle as FileSystemFileHandle,
                        password: sessionPassword || undefined,
                        needsPermission: !space.isVirtual && handle !== null 
                    };
                }));
                setOpenFiles(restoredSpaces.filter(s => s.isVirtual || s.handle !== null));
            } catch (e) {
                console.error("Failed to restore file spaces", e);
            }
        }
    };
    loadPersistedFileSpaces();
  }, []);

  useEffect(() => {
    const metadata = openFiles.map(({ handle, password, ...meta }) => meta);
    localStorage.setItem(STORAGE_KEYS.fileSpaces, JSON.stringify(metadata));
  }, [openFiles]);

  useEffect(() => {
      try {
          const storedLogos = localStorage.getItem(STORAGE_KEYS.customLogos);
          if (storedLogos) setCustomLogos(JSON.parse(storedLogos));
      } catch (e) {}
  }, []);

  useEffect(() => {
    const storedHash = localStorage.getItem(STORAGE_KEYS.passwordHash);
    const storedSalt = localStorage.getItem(STORAGE_KEYS.salt);
    const sessionMaster = sessionStorage.getItem(STORAGE_KEYS.sessionMasterKey);
    
    if (storedHash && storedSalt) {
        setHasPassword(true);
        if (sessionMaster) {
            handleUnlock(sessionMaster).then(success => {
                if (!success) {
                   setIsLocked(true);
                   sessionStorage.removeItem(STORAGE_KEYS.sessionMasterKey);
                }
            });
        } else {
            setIsLocked(true);
        }
    } else {
        setHasPassword(false);
        setIsLocked(false);
        loadData('local', null);
    }
  }, []);

  const loadData = async (mode: StorageMode, password: string | null) => {
      if (mode === 'file') return;
      const key = STORAGE_KEYS[mode];
      const storage = mode === 'local' ? localStorage : sessionStorage;
      const stored = storage.getItem(key);
      if (!stored) { setAccounts([]); return; }
      
      if (mode === 'local' && password) {
          const salt = localStorage.getItem(STORAGE_KEYS.salt);
          if (salt) {
              const decrypted = await decryptData(stored, password, salt);
              if (decrypted) setAccounts(JSON.parse(decrypted));
              else setAccounts([]);
          }
      } else {
          try {
              if (stored.trim().startsWith('[') || stored.trim().startsWith('{')) setAccounts(JSON.parse(stored));
              else setAccounts([]);
          } catch (e) { setAccounts([]); }
      }
  };

  const verifyFilePermission = async (file: FileSpace) => {
      if (!file.handle) return false;
      try {
          // @ts-ignore
          let permission = await file.handle.queryPermission({ mode: 'readwrite' });
          if (permission === 'granted') return true;
          // @ts-ignore
          permission = await file.handle.requestPermission({ mode: 'readwrite' });
          return permission === 'granted';
      } catch (e) { return false; }
  };

  const handleSwitchFile = async (fileId: string) => {
      const file = openFiles.find(f => f.id === fileId);
      if (!file) return;

      if (file.needsPermission) {
          const granted = await verifyFilePermission(file);
          if (!granted) {
              showToast("Permission denied", 'error');
              return;
          }
          setOpenFiles(prev => prev.map(f => f.id === fileId ? { ...f, needsPermission: false } : f));
      }

      const sessionFileKey = sessionStorage.getItem(STORAGE_KEYS.sessionFileKeyPrefix + fileId);

      if (file.handle) {
          try {
              await (file.handle as any).getFile();
          } catch (e) {
              showToast(t.errFileNotFound, 'error');
              setOpenFiles(prev => prev.filter(f => f.id !== fileId));
              handleStore.remove(fileId);
              if (currentFileId === fileId) {
                  setCurrentFileId(null);
                  setAccounts([]);
              }
              return;
          }
      }

      if (file.isEncrypted && !file.password) {
          if (sessionFileKey) {
             try {
                const { encryptedData } = await readFileRaw(file.handle as FileSystemFileHandle);
                const decrypted = await decryptData(encryptedData.data, sessionFileKey, encryptedData.salt);
                if (decrypted) {
                    setOpenFiles(prev => prev.map(f => f.id === fileId ? { ...f, password: sessionFileKey } : f));
                    setCurrentFileId(fileId);
                    setAccounts(JSON.parse(decrypted));
                    return;
                }
             } catch(e) { 
                 sessionStorage.removeItem(STORAGE_KEYS.sessionFileKeyPrefix + fileId); 
             }
          }
          try {
              if (file.handle) {
                  const { encryptedData } = await readFileRaw(file.handle as FileSystemFileHandle);
                  setPendingFile({ space: file, rawEncryptedData: encryptedData });
                  setShowFileUnlockModal(true);
              }
          } catch (e) { showToast("File access error", 'error'); }
          return;
      }

      setCurrentFileId(fileId);
      try {
          if (file.handle) {
              // @ts-ignore
              const fileObj = await file.handle.getFile();
              const text = await fileObj.text();
              const parsed = JSON.parse(text);
              if (file.isEncrypted && file.password) {
                 const decrypted = await decryptData(parsed.data, file.password, parsed.salt);
                 if (decrypted) setAccounts(JSON.parse(decrypted));
                 else setAccounts([]); 
              } else {
                 setAccounts(Array.isArray(parsed) ? parsed : []);
              }
          }
      } catch (e) { setAccounts([]); }
  };

  useEffect(() => {
      if (!isLocked) {
          if (activeTab === 'file') {
              if (currentFileId) handleSwitchFile(currentFileId);
              else setAccounts([]);
          } else {
              loadData(activeTab, sessionKey);
          }
          setSelectedIds(new Set());
          setSearchQuery('');
          setIsSearchFocused(false);
          setVisibleQRIds(new Set());
      }
  }, [activeTab, isLocked]);

  const handleUnlock = async (password: string) => {
      const storedHash = localStorage.getItem(STORAGE_KEYS.passwordHash);
      const storedSalt = localStorage.getItem(STORAGE_KEYS.salt);
      if (!storedHash || !storedSalt) return false;
      const inputHash = await hashPassword(password, storedSalt);
      if (inputHash === storedHash) {
          setSessionKey(password);
          sessionStorage.setItem(STORAGE_KEYS.sessionMasterKey, password);
          setIsLocked(false);
          await loadData('local', password); 
          return true;
      }
      return false;
  };

  const handleResetLock = () => {
      localStorage.removeItem(STORAGE_KEYS.passwordHash);
      localStorage.removeItem(STORAGE_KEYS.salt);
      localStorage.removeItem(STORAGE_KEYS.local); 
      sessionStorage.removeItem(STORAGE_KEYS.sessionMasterKey);
      setHasPassword(false);
      setIsLocked(false);
      setSessionKey(null);
      setAccounts([]);
      showToast('App reset', 'info');
  };

  const handleSetPassword = async (password: string) => {
      const salt = generateSalt();
      const hash = await hashPassword(password, salt);
      localStorage.setItem(STORAGE_KEYS.salt, salt);
      localStorage.setItem(STORAGE_KEYS.passwordHash, hash);
      setSessionKey(password);
      sessionStorage.setItem(STORAGE_KEYS.sessionMasterKey, password);
      setHasPassword(true);
      await saveAccountsInternal(accounts, password, 'local');
      showToast(t.passwordSet, 'success');
  };

  const handleRemovePassword = async (currentPassword: string) => {
      const storedSalt = localStorage.getItem(STORAGE_KEYS.salt);
      const storedHash = localStorage.getItem(STORAGE_KEYS.passwordHash);
      if (storedSalt && storedHash) {
          const inputHash = await hashPassword(currentPassword, storedSalt);
          if (inputHash === storedHash) {
               localStorage.removeItem(STORAGE_KEYS.passwordHash);
               localStorage.removeItem(STORAGE_KEYS.salt);
               sessionStorage.removeItem(STORAGE_KEYS.sessionMasterKey);
               setHasPassword(false);
               setSessionKey(null);
               await saveAccountsInternal(accounts, null, 'local');
               showToast(t.passwordRemoved, 'success');
               return true;
          }
      }
      return false;
  };

  const handleChangePassword = async (oldPassword: string, newPassword: string) => {
      const storedSalt = localStorage.getItem(STORAGE_KEYS.salt);
      const storedHash = localStorage.getItem(STORAGE_KEYS.passwordHash);
      if (storedSalt && storedHash) {
          const inputHash = await hashPassword(oldPassword, storedSalt);
          if (inputHash === storedHash) {
              const newSalt = generateSalt();
              const newHash = await hashPassword(newPassword, newSalt);
              localStorage.setItem(STORAGE_KEYS.salt, newSalt);
              localStorage.setItem(STORAGE_KEYS.passwordHash, newHash);
              setSessionKey(newPassword);
              sessionStorage.setItem(STORAGE_KEYS.sessionMasterKey, newPassword);
              await saveAccountsInternal(accounts, newPassword, 'local');
              showToast("Password changed", 'success');
              return true;
          }
      }
      return false;
  }

  const saveAccountsInternal = async (newAccounts: OTPAccount[], key: string | null, mode: StorageMode) => {
      if (mode === 'file') {
          const targetId = passwordTargetFileId || currentFileId;
          if (targetId) {
             const file = openFiles.find(f => f.id === targetId);
             if (file) await saveToFile(file, newAccounts);
          }
          return;
      }
      const storageKey = STORAGE_KEYS[mode];
      const storage = mode === 'local' ? localStorage : sessionStorage;
      const json = JSON.stringify(newAccounts);
      if (mode === 'local' && key) {
          const salt = localStorage.getItem(STORAGE_KEYS.salt);
          if (salt) {
              const encrypted = await encryptData(json, key, salt);
              storage.setItem(storageKey, encrypted);
          }
      } else storage.setItem(storageKey, json);
  };

  const saveToFile = async (fileSpace: FileSpace, accountsData: OTPAccount[]) => {
      if (fileSpace.handle) {
          try {
              const handle = fileSpace.handle as any;
              const writable = await handle.createWritable();
              const json = JSON.stringify(accountsData);
              if (fileSpace.isEncrypted && fileSpace.password) {
                  const salt = generateSalt();
                  const encrypted = await encryptData(json, fileSpace.password, salt);
                  const fileContent = JSON.stringify({ isEncrypted: true, data: encrypted, salt: salt });
                  await writable.write(fileContent);
              } else await writable.write(json);
              await writable.close();
          } catch (e) { showToast("Save failed", "error"); }
      } 
      else if (fileSpace.isVirtual) {
          const json = JSON.stringify(accountsData);
          let content = json;
          if (fileSpace.isEncrypted && fileSpace.password) {
              const salt = generateSalt();
              const encrypted = await encryptData(json, fileSpace.password, salt);
              content = JSON.stringify({ isEncrypted: true, data: encrypted, salt: salt });
          }
          const blob = new Blob([content], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileSpace.displayName || '2fa-export.json';
          a.click();
          URL.revokeObjectURL(url);
          showToast("Download started", 'info');
      }
  };

  const readFileRaw = async (handle: FileSystemFileHandle) => {
      const fileData = await handle.getFile();
      const text = await fileData.text();
      return parseRawFileContent(text, handle.name, handle);
  };

  const parseRawFileContent = (text: string, name: string, handle: FileSystemFileHandle | null) => {
      let parsed;
      let isEncrypted = false;
      let encryptedData = { isEncrypted: false, data: '', salt: '' };
      try {
          parsed = JSON.parse(text);
          if (parsed && parsed.isEncrypted && parsed.data && parsed.salt) {
              isEncrypted = true;
              encryptedData = parsed;
          }
      } catch(e) { parsed = []; }
      const newFileSpace: FileSpace = { id: uuidv4(), displayName: name, handle: handle, isEncrypted: isEncrypted, isVirtual: handle === null };
      return { newFileSpace, parsed, isEncrypted, encryptedData };
  }

  const handleOpenFile = async () => {
      if (!fileSystemClient.supported) { fileInputRef.current?.click(); return; }
      try {
          const handles = await fileSystemClient.openFile({ types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }] });
          if (handles && handles.length > 0) {
              const handle = handles[0];
              const { newFileSpace, parsed, isEncrypted, encryptedData } = await readFileRaw(handle);
              await handleStore.save(newFileSpace.id, handle);
              if (isEncrypted) { 
                  setPendingFile({ space: newFileSpace, rawEncryptedData: encryptedData }); 
                  setShowFileUnlockModal(true); 
              }
              else { 
                  setOpenFiles(prev => [...prev, newFileSpace]); 
                  setCurrentFileId(newFileSpace.id); 
                  setAccounts(Array.isArray(parsed) ? parsed : []); 
              }
          }
      } catch (e: any) {}
  };

  const handleLegacyFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
          if (ev.target?.result) {
              const text = ev.target.result as string;
              const { newFileSpace, parsed, isEncrypted, encryptedData } = parseRawFileContent(text, file.name, null);
              if (isEncrypted) { 
                  setPendingFile({ space: newFileSpace, rawEncryptedData: encryptedData }); 
                  setShowFileUnlockModal(true); 
              }
              else { 
                  setOpenFiles(prev => [...prev, newFileSpace]); 
                  setCurrentFileId(newFileSpace.id); 
                  setAccounts(Array.isArray(parsed) ? parsed : []); 
              }
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  const handleOpenFolder = async () => {
     if (!fileSystemClient.supported) return;
     try {
         const dirHandle = await fileSystemClient.openDirectory();
         const entries = await fileSystemClient.getDirectoryEntries(dirHandle);
         const jsonFiles = entries.filter(e => e.kind === 'file' && e.name.toLowerCase().endsWith('.json'));
         if (jsonFiles.length === 0) return;
         const newSpaces: FileSpace[] = [];
         for (const entry of jsonFiles) {
             try {
                const fileHandle = entry.handle as FileSystemFileHandle;
                const { newFileSpace } = await readFileRaw(fileHandle);
                if (!openFiles.some(f => f.displayName === newFileSpace.displayName)) {
                    await handleStore.save(newFileSpace.id, fileHandle);
                    newSpaces.push(newFileSpace);
                }
             } catch (err) {}
         }
         if (newSpaces.length > 0) setOpenFiles(prev => [...prev, ...newSpaces]);
     } catch (e: any) {}
  };

  const handleCreateFile = async () => {
      if (!fileSystemClient.supported) {
          const newFileId = uuidv4();
          setOpenFiles(prev => [...prev, { id: newFileId, displayName: 'Untitled.json', handle: null, isEncrypted: false, isVirtual: true }]);
          setCurrentFileId(newFileId);
          setAccounts([]);
          return;
      }
      try {
          const handle = await fileSystemClient.createFile({ suggestedName: '2fa-accounts.json', types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }] });
          const newFileId = uuidv4();
          await handleStore.save(newFileId, handle);
          setOpenFiles(prev => [...prev, { id: newFileId, displayName: handle.name, handle: handle, isEncrypted: false }]);
          setCurrentFileId(newFileId);
          setAccounts([]);
          const writable = await (handle as any).createWritable();
          await writable.write("[]");
          await writable.close();
      } catch (e: any) {}
  };

  const handleUnlockFile = async (password: string) => {
      if (!pendingFile) return;
      const { data, salt } = pendingFile.rawEncryptedData;
      const decrypted = await decryptData(data, password, salt);
      if (decrypted) {
          const accountsData = JSON.parse(decrypted);
          sessionStorage.setItem(STORAGE_KEYS.sessionFileKeyPrefix + pendingFile.space.id, password);
          if (!openFiles.some(f => f.id === pendingFile.space.id)) {
             setOpenFiles(prev => [...prev, { ...pendingFile.space, password: password }]);
          } else {
             setOpenFiles(prev => prev.map(f => f.id === pendingFile.space.id ? { ...f, password: password } : f));
          }
          setCurrentFileId(pendingFile.space.id);
          setAccounts(accountsData);
          setPendingFile(null);
          setShowFileUnlockModal(false);
      } else throw new Error("Wrong Password");
  };

  const handleCancelUnlock = () => {
      setPendingFile(null);
      setShowFileUnlockModal(false);
  };

  const handleFileRename = (id: string) => {
      const space = openFiles.find(f => f.id === id);
      const name = prompt(t.labelRenameFile, space?.displayName || "");
      if (name) setOpenFiles(prev => prev.map(f => f.id === id ? { ...f, displayName: name } : f));
  };

  const handleCloseFile = (id: string) => {
      if (confirm(t.confirmCloseFile)) {
          setOpenFiles(prev => prev.filter(f => f.id !== id));
          handleStore.remove(id); 
          sessionStorage.removeItem(STORAGE_KEYS.sessionFileKeyPrefix + id);
          if (currentFileId === id) { setCurrentFileId(null); setAccounts([]); }
      }
  };

  const handleSetFilePassword = async (password: string) => {
      const fileId = passwordTargetFileId;
      if (!fileId) return;
      const file = openFiles.find(f => f.id === fileId);
      if (file) {
          const updatedFile = { ...file, isEncrypted: true, password: password };
          if (currentFileId === fileId) {
            await saveToFile(updatedFile, accounts);
            setAccounts([...accounts]);
          } else {
            await saveToFile(updatedFile, accounts);
          }
          sessionStorage.setItem(STORAGE_KEYS.sessionFileKeyPrefix + fileId, password);
          setOpenFiles(prev => prev.map(f => f.id === fileId ? updatedFile : f));
          showToast(t.filePassSet, 'success');
      }
  };

  const handleRemoveFilePassword = async (currPass: string) => {
      const fileId = passwordTargetFileId;
      if (!fileId) return false;
      const file = openFiles.find(f => f.id === fileId);
      if (file && file.password === currPass) {
           const updatedFile = { ...file, isEncrypted: false, password: undefined };
           if (currentFileId === fileId) await saveToFile(updatedFile, accounts);
           sessionStorage.removeItem(STORAGE_KEYS.sessionFileKeyPrefix + fileId);
           setOpenFiles(prev => prev.map(f => f.id === fileId ? updatedFile : f));
           showToast(t.filePassRemoved, 'success');
           return true;
      }
      return false;
  };

  const handleChangeFilePassword = async (oldPass: string, newPass: string) => {
      const fileId = passwordTargetFileId;
      if (!fileId) return false;
      const file = openFiles.find(f => f.id === fileId);
      if (file && file.password === oldPass) {
          const updatedFile = { ...file, isEncrypted: true, password: newPass };
          if (currentFileId === fileId) await saveToFile(updatedFile, accounts);
          sessionStorage.setItem(STORAGE_KEYS.sessionFileKeyPrefix + fileId, newPass);
          setOpenFiles(prev => prev.map(f => f.id === fileId ? updatedFile : f));
          showToast("File password changed", 'success');
          return true;
      }
      return false;
  };

  const handleOpenMenuViaButton = (e: React.MouseEvent, fileId: string) => {
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setContextMenu({
          x: rect.left,
          y: rect.bottom + 5,
          fileId
      });
  };

  const handleOpenPasswordModalFromMenu = (fileId: string) => {
      setPasswordTargetFileId(fileId);
      setContextMenu(null);
      setShowPasswordModal(true);
  };

  const handleOpenPasswordModalFromSettings = () => {
      if (activeTab === 'file' && currentFileId) {
          setPasswordTargetFileId(currentFileId);
      } else {
          setPasswordTargetFileId(null);
      }
      setShowSettingsDropdown(false);
      setShowPasswordModal(true);
  };

  const saveAccounts = (newAccounts: OTPAccount[]) => {
      setAccounts(newAccounts);
      saveAccountsInternal(newAccounts, sessionKey, activeTab);
  };

  const handleAddLogo = (logo: AppLogo) => { saveCustomLogos([...customLogos, logo]); showToast(t.logoAdded, 'success'); };
  const saveCustomLogos = (logos: AppLogo[]) => { setCustomLogos(logos); localStorage.setItem(STORAGE_KEYS.customLogos, JSON.stringify(logos)); };
  const handleDeleteLogo = (id: string) => saveCustomLogos(customLogos.filter(l => l.id !== id));
  const handleBatchDeleteLogos = (ids: string[]) => { const idSet = new Set(ids); saveCustomLogos(customLogos.filter(l => !idSet.has(l.id))); };
  const handleImportLogos = (newLogos: AppLogo[]) => { const existingIds = new Set(customLogos.map(l => String(l.id))); const filteredNew = newLogos.filter(l => !existingIds.has(String(l.id))); if (filteredNew.length > 0) saveCustomLogos([...customLogos, ...filteredNew]); };

  const handleSaveAccount = (data: Omit<OTPAccount, 'id' | 'createdAt'>) => {
    if (editingAccount) saveAccounts(accounts.map(acc => acc.id === editingAccount.id ? { ...acc, ...data } : acc));
    else saveAccounts([...accounts, { ...data, id: uuidv4(), createdAt: Date.now() }]);
    setEditingAccount(undefined);
  };

  const handleBatchScan = (candidates: ImportCandidate[]) => { setImportCandidates(candidates); setShowAccountModal(false); setShowImportPreview(true); };
  const handleBatchSave = (updates: Partial<OTPAccount>) => { saveAccounts(accounts.map(acc => selectedIds.has(acc.id) ? { ...acc, ...updates } : acc)); setShowBatchEditModal(false); setSelectedIds(new Set()); };
  const handleImportPreview = (candidates: ImportCandidate[]) => { setImportCandidates(candidates); setShowImportModal(false); setShowImportPreview(true); };
  
  const handleConfirmImport = (selectedCandidates: ImportCandidate[]) => { 
    const newAccounts: OTPAccount[] = selectedCandidates.map(item => ({ 
      issuer: item.issuer || 'Import', 
      account: item.account || 'Unknown', 
      secret: item.secret, 
      period: item.period || 30, 
      notes: item.notes || '', 
      logoId: item.logoId ? String(item.logoId) : '', 
      id: uuidv4(), 
      createdAt: Date.now() 
    }));
    saveAccounts([...accounts, ...newAccounts]); 
    setShowImportPreview(false); 
    setImportCandidates([]); 
  };
  
  const handleDelete = (id: string) => { if (window.confirm(t.confirmDelete)) { saveAccounts(accounts.filter(a => a.id !== id)); setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; }); } };
  const handleEdit = (account: OTPAccount) => { setEditingAccount(account); setShowAccountModal(true); };
  const handleToggleSelect = (id: string) => { const next = new Set(selectedIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedIds(next); };
  const handleSelectAll = () => { if (selectedIds.size === filteredAccounts.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filteredAccounts.map(a => a.id))); };
  const handleBulkDelete = () => { if (window.confirm(t.confirmBulkDelete)) { saveAccounts(accounts.filter(a => !selectedIds.has(a.id))); setSelectedIds(new Set()); } };
  const handleToggleQR = (id: string) => { setVisibleQRIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const handleToggleSelectedQR = () => { const selArr = Array.from(selectedIds); const allVis = selArr.every(id => visibleQRIds.has(id)); setVisibleQRIds(prev => { const next = new Set(prev); if (allVis) selArr.forEach(id => next.delete(id)); else selArr.forEach(id => next.add(id)); return next; }); };

  const filteredAccounts = (function() {
    if (!searchQuery.trim()) return accounts;
    const keywords = searchQuery.toLowerCase().split(/\s+/).filter(k => k.length > 0);
    return accounts.filter(acc => {
      const searchString = `${acc.issuer} ${acc.account} ${acc.notes || ''}`.toLowerCase();
      return keywords.every(kw => searchString.includes(kw));
    });
  })();

  const themeClasses = getThemeClasses();
  const selectedAreAllVisible = selectedIds.size > 0 && Array.from(selectedIds).every(id => visibleQRIds.has(id));

  function getThemeClasses() {
     const common = { tabActive: 'bg-white dark:bg-gray-800 shadow-sm' };
     if (themeColor === 'blue') return { ...common, primaryBg: 'bg-blue-600', primaryHover: 'hover:bg-blue-700', textGradient: 'from-blue-700 to-blue-500 dark:from-blue-500 dark:to-blue-400', focusRing: 'focus:ring-blue-500', checkboxText: 'text-blue-600', iconBg: 'bg-blue-600', tabActive: `${common.tabActive} text-blue-600 dark:text-blue-400`, lightBg: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-100 dark:border-blue-900/30' };
     if (themeColor === 'orange') return { ...common, primaryBg: 'bg-orange-600', primaryHover: 'hover:bg-orange-700', textGradient: 'from-orange-700 to-orange-500 dark:from-orange-700 dark:to-orange-500', focusRing: 'focus:ring-orange-500', checkboxText: 'text-orange-600', iconBg: 'bg-orange-600', tabActive: `${common.tabActive} text-orange-600 dark:text-orange-400`, lightBg: 'bg-orange-50 dark:bg-orange-900/20', borderColor: 'border-orange-100 dark:border-orange-900/30' };
     return { ...common, primaryBg: 'bg-emerald-600', primaryHover: 'hover:bg-emerald-700', textGradient: 'from-emerald-700 to-emerald-500 dark:from-emerald-500 dark:to-emerald-400', focusRing: 'focus:ring-emerald-500', checkboxText: 'text-emerald-600', iconBg: 'bg-emerald-600', tabActive: `${common.tabActive} text-emerald-600 dark:text-emerald-400`, lightBg: 'bg-emerald-50 dark:bg-emerald-900/20', borderColor: 'border-emerald-100 dark:border-emerald-900/30' };
  }

  if (isLocked) return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
        <LockScreen onUnlock={handleUnlock} onReset={handleResetLock} />
    </LanguageContext.Provider>
  );

  const targetFile = openFiles.find(f => f.id === passwordTargetFileId);
  const targetNameSuffix = targetFile?.displayName || "";
  const isTargetingFile = !!passwordTargetFileId;

  /**
   * 安全菜单上下文划分逻辑（脱离全局存储主题）：
   * 应用安全上下文（蓝色系）：本地、会话、文件模式未选中文件。
   * 文件安全上下文（绿色系）：文件模式已选中文件。
   */
  const securityCtxColor = (activeTab === 'file' && currentFileId) ? 'emerald' : 'blue';
  const securityLabel = (activeTab === 'file' && currentFileId) ? t.fileSecurityTitle : t.securityTitle;
  const isSecurityActive = (activeTab === 'file' && currentFileId) 
    ? !!(openFiles.find(f => f.id === currentFileId)?.isEncrypted)
    : hasPassword;

  return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <input type="file" ref={fileInputRef} className="hidden" accept=".json,application/json" onChange={handleLegacyFileSelect} />
      
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans transition-colors duration-200">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 transition-colors duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-14 items-center gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <div className={`${themeClasses.iconBg} p-1.5 rounded-lg transition-colors duration-300`}>
                  <ShieldCheck className="text-white h-5 w-5" />
                </div>
                <h1 className={`text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r ${themeClasses.textGradient} hidden md:block transition-all duration-300`}>
                  {t.appTitle}
                </h1>
              </div>
              
              <div className={`flex-1 transition-all duration-300 ${isSearchFocused ? 'max-w-full' : 'max-w-md mx-auto'}`}>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className={`h-4 w-4 text-gray-400 group-focus-within:${themeClasses.checkboxText} transition-colors`} />
                    </div>
                    <input type="text" className={`block w-full pl-9 pr-9 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-2 ${themeClasses.focusRing} focus:border-transparent transition-all text-sm`} placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setIsSearchFocused(false)} />
                    {searchQuery && <button onMouseDown={(e) => { e.preventDefault(); setSearchQuery(''); }} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"><X size={14} /></button>}
                </div>
              </div>

              <div className={`flex items-center gap-2 shrink-0 transition-all duration-300 ${isSearchFocused ? 'w-0 opacity-0 overflow-hidden m-0 m-0 p-0' : 'w-auto opacity-100'}`}>
                <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-lg relative">
                  <button onClick={() => setActiveTab('local')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${activeTab === 'local' ? themeClasses.tabActive : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                    <HardDrive size={14} /> <span className="hidden sm:inline">{t.tabLocal}</span>
                  </button>
                  <button onClick={() => setActiveTab('file')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${activeTab === 'file' ? themeClasses.tabActive : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                    <FolderOpen size={14} /> <span className="hidden sm:inline">{t.tabFile}</span>
                  </button>
                  <button onClick={() => setActiveTab('session')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all ${activeTab === 'session' ? themeClasses.tabActive : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
                    <Zap size={14} /> <span className="hidden sm:inline">{t.tabSession}</span>
                  </button>
                  
                  <div className="relative flex items-center ml-1">
                    <button onMouseEnter={() => setShowInfo(true)} onMouseLeave={() => setShowInfo(false)} onClick={() => setShowInfo(!showInfo)} className={`p-1.5 transition-colors ${themeClasses.checkboxText} opacity-60 hover:opacity-100`}><Info size={16} /></button>
                    {showInfo && (
                        <div className={`absolute top-full right-0 mt-2 w-64 p-3 bg-white dark:bg-gray-800 border rounded-lg shadow-xl z-[100] animate-in fade-in zoom-in duration-150 ${themeClasses.borderColor}`}>
                            <h4 className={`font-bold text-sm mb-1 ${themeClasses.checkboxText}`}>{modeTitle}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{modeDesc}</p>
                        </div>
                    )}
                  </div>
                </div>

                <div className="relative" ref={settingsRef}>
                    <button onClick={() => setShowSettingsDropdown(!showSettingsDropdown)} className={`p-2 text-gray-500 dark:text-gray-400 hover:${themeClasses.checkboxText} hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition flex items-center gap-1`}>
                        <Settings size={20} />
                    </button>
                    
                    {showSettingsDropdown && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                             <button onClick={handleOpenPasswordModalFromSettings} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${securityCtxColor === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                <Lock size={16} className={isSecurityActive ? (securityCtxColor === 'emerald' ? 'text-emerald-500' : 'text-blue-500') : 'text-gray-400 opacity-40'} />
                                <span className="flex-1 text-left font-medium">{securityLabel}</span>
                                {isSecurityActive && <div className={`w-2 h-2 rounded-full ${securityCtxColor === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'}`} />}
                             </button>
                             
                             <button onClick={() => { 
                                 if (theme === 'system') setTheme('light');
                                 else if (theme === 'light') setTheme('dark');
                                 else setTheme('system');
                             }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                {theme === 'light' ? <Sun size={16} /> : (theme === 'dark' ? <Moon size={16} /> : <Monitor size={16} />)}
                                <span className="flex-1 text-left">{t.themeLabel}: {theme === 'light' ? t.themeLight : (theme === 'dark' ? t.themeDark : t.themeSystem)}</span>
                             </button>

                             <button onClick={() => { setLang(lang === 'en' ? 'zh' : 'en'); setShowSettingsDropdown(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <Languages size={16} className="text-gray-400" />
                                <span className="flex-1 text-left">{t.headerSwitchTo} {lang === 'en' ? '中文' : 'English'}</span>
                             </button>
                        </div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {showLogoManager ? (
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                 <div className="mb-4 flex items-center gap-2">
                    <button onClick={() => setShowLogoManager(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium text-sm flex items-center gap-1">&larr; Back to Accounts</button>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white ml-2">{t.manageLogos}</h2>
                 </div>
                 <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                     <LogoManagerModal onClose={() => setShowLogoManager(false)} logos={customLogos} onAddLogo={handleAddLogo} onDeleteLogo={handleDeleteLogo} onBatchDeleteLogo={handleBatchDeleteLogos} onImportLogos={handleImportLogos} inline={true} color={themeColor} />
                 </div>
            </main>
        ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'file' && (
              <div className="mb-6 bg-white dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="flex gap-2 shrink-0">
                          <button onClick={handleOpenFile} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap"><FolderOpen size={14} /> {t.btnOpenFile}</button>
                          <button onClick={handleOpenFolder} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap"><FolderOpen size={14} /> {t.btnOpenFolder}</button>
                      </div>
                      <button onClick={handleCreateFile} className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition whitespace-nowrap"><FilePlus size={14} /> {t.btnCreateFile}</button>
                      <div className="h-px w-full sm:h-5 sm:w-px bg-gray-300 dark:bg-gray-600 mx-0 sm:mx-1"></div>
                      <div 
                        className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 w-full no-scrollbar select-none"
                        onWheel={(e) => {
                            if (e.deltaY !== 0) {
                                e.currentTarget.scrollLeft += e.deltaY;
                            }
                        }}
                      >
                          {openFiles.length === 0 && <span className="text-xs text-gray-400 dark:text-gray-500 self-center italic">No files open</span>}
                          {openFiles.map(f => (
                              <div 
                                key={f.id} 
                                className={`flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-md border text-xs whitespace-nowrap transition shrink-0 group ${currentFileId === f.id ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                              >
                                  <button onClick={() => handleSwitchFile(f.id)} className="flex items-center gap-2 outline-none">
                                      {f.needsPermission ? <ShieldAlert size={10} className="text-orange-500" /> : (f.isEncrypted ? <Lock size={10} className={f.password ? "text-green-500" : "text-gray-400"}/> : <FileJson size={10} className="opacity-50"/>)}
                                      <span className="max-w-[120px] truncate">{f.displayName}</span>
                                      {f.isVirtual && <AlertTriangle size={10} className="text-orange-400" />}
                                  </button>
                                  <button 
                                    onClick={(e) => handleOpenMenuViaButton(e, f.id)}
                                    className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors ml-1"
                                  >
                                    <MoreVertical size={12} className="opacity-40 group-hover:opacity-100" />
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          <div className="flex flex-col xl:flex-row gap-4 mb-6 justify-between items-start xl:items-center">
             <div className="flex flex-wrap gap-2 w-full sm:w-auto flex-nowrap overflow-x-auto pb-1 sm:pb-0">
                <button onClick={() => { setEditingAccount(undefined); setShowAccountModal(true); }} disabled={activeTab === 'file' && (!currentFileId || (openFiles.find(f => f.id === currentFileId)?.isEncrypted && !openFiles.find(f => f.id === currentFileId)?.password))} className={`flex items-center gap-2 ${themeClasses.primaryBg} ${themeClasses.primaryHover} text-white px-3 py-2 rounded-lg shadow-sm hover:shadow transition text-sm font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed`}><Plus size={16} /> <span className="hidden sm:inline">{t.addAccount}</span></button>
                <button onClick={() => setShowImportModal(true)} disabled={activeTab === 'file' && (!currentFileId || (openFiles.find(f => f.id === currentFileId)?.isEncrypted && !openFiles.find(f => f.id === currentFileId)?.password))} className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg transition text-sm font-medium whitespace-nowrap disabled:opacity-50"><Upload size={16} /> <span className="hidden sm:inline">{t.importBatch}</span></button>
                <button onClick={() => setShowExportModal(true)} disabled={accounts.length === 0} className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg transition text-sm font-medium disabled:opacity-50 whitespace-nowrap"><Download size={16} /> <span className="hidden sm:inline">{t.exportBatch}</span></button>
                <button onClick={() => setShowLogoManager(true)} className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg transition text-sm font-medium whitespace-nowrap"><ImageIcon size={16} /> <span className="hidden sm:inline">{t.manageLogos}</span></button>
                {filteredAccounts.length > 0 && <button onClick={handleSelectAll} className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg transition text-sm font-medium whitespace-nowrap ml-auto sm:ml-0">{selectedIds.size === filteredAccounts.length ? <CheckSquare size={16} /> : <Square size={16} />}</button>}
             </div>
          </div>

          {filteredAccounts.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
              <div className="bg-gray-50 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><ShieldCheck className="text-gray-300 dark:text-gray-500 w-8 h-8" /></div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{searchQuery ? "No matching accounts" : t.noAccountsTitle}</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">{searchQuery ? "Try refining your search terms." : t.noAccountsDesc}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAccounts.map(acc => <AccountCard key={acc.id} account={acc} logo={customLogos.find(l => String(l.id) === String(acc.logoId))} onDelete={handleDelete} onEdit={handleEdit} isSelected={selectedIds.has(acc.id)} onToggleSelect={handleToggleSelect} showQR={visibleQRIds.has(acc.id)} onToggleQR={handleToggleQR} color={themeColor} />)}
            </div>
          )}
        </main>
        )}

        <footer className="w-full py-6 flex flex-col justify-center items-center pointer-events-none mb-4">
            <a 
                href="https://yubo.ltd" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-full border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all pointer-events-auto group no-underline"
            >
                <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                Developed by <span className="font-bold">AnerYubo</span>
                </span>
            </a>
            <span className="text-[10px] text-gray-400 mt-2 text-center px-4">承诺无任何数据传输云端等操作；全部数据仅保存到您的浏览器中</span>
            <span className="text-[10px] text-gray-400 mt-1">© 2025 AnerYubo . All Rights Reserved</span>
        </footer>

        {selectedIds.size > 0 && !showLogoManager && (
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-3 z-40 animate-in slide-in-from-bottom duration-300">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 px-0 sm:px-4">
                    <div className="w-full sm:w-auto flex justify-between sm:justify-start items-center"><span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">{selectedIds.size} {t.selected}</span></div>
                    <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:gap-2">
                        <button onClick={() => setShowBatchEditModal(true)} className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg transition text-xs font-medium"><Edit2 size={14} /> {t.btnBatchEdit}</button>
                        <button onClick={() => setShowExportModal(true)} className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg transition text-xs font-medium"><Download size={14} /> {t.exportSelected}</button>
                        <button onClick={handleToggleSelectedQR} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition text-xs font-medium ${selectedAreAllVisible ? 'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'}`}><QrCode size={14} /> {selectedAreAllVisible ? t.hideQR : t.showQR}</button>
                        <button onClick={handleBulkDelete} className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg transition text-xs font-medium"><Trash2 size={14} /> {t.deleteSelected}</button>
                    </div>
                </div>
            </div>
        )}

        {/* File Context Menu */}
        {contextMenu && (
            <div 
                ref={contextMenuRef}
                className="fixed bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-xl py-1 z-[80] w-48 animate-in fade-in zoom-in-95 duration-100"
                style={{ top: contextMenu.y, left: Math.min(contextMenu.x, window.innerWidth - 200) }}
            >
                <button onClick={() => { handleFileRename(contextMenu.fileId); setContextMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <PenLine size={14} /> {t.labelRenameFile}
                </button>
                <button onClick={() => { handleOpenPasswordModalFromMenu(contextMenu.fileId); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Lock size={14} /> {t.setPassword}
                </button>
                <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>
                <button onClick={() => { handleCloseFile(contextMenu.fileId); setContextMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <XCircle size={14} /> {t.btnCloseFile}
                </button>
            </div>
        )}

        {showAccountModal && <AccountFormModal onClose={() => { setShowAccountModal(false); setEditingAccount(undefined); }} onSave={handleSaveAccount} onBatchScan={handleBatchScan} initialData={editingAccount} logos={customLogos} color={themeColor} />}
        {showBatchEditModal && <BatchEditModal onClose={() => setShowBatchEditModal(false)} onSave={handleBatchSave} logos={customLogos} color={themeColor} />}
        {showImportModal && <BatchImportModal onClose={() => setShowImportModal(false)} onPreview={handleImportPreview} color={themeColor} />}
        
        {showPasswordModal && (
            <PasswordSettingsModal 
                onClose={() => { setShowPasswordModal(false); setPasswordTargetFileId(null); }} 
                hasPassword={passwordTargetFileId ? (openFiles.find(f => f.id === passwordTargetFileId)?.isEncrypted || false) : hasPassword} 
                onSetPassword={passwordTargetFileId ? handleSetFilePassword : handleSetPassword} 
                onRemovePassword={passwordTargetFileId ? handleRemoveFilePassword : handleRemovePassword} 
                onChangePassword={passwordTargetFileId ? handleChangeFilePassword : handleChangePassword} 
                color={isTargetingFile ? 'emerald' : 'blue'} 
                titleSuffix={targetNameSuffix}
                isAppSecurity={!isTargetingFile}
            />
        )}

        {showFileUnlockModal && pendingFile && (
            <PasswordSettingsModal 
                onClose={handleCancelUnlock} 
                hasPassword={false} 
                isUnlock={true} 
                onSetPassword={handleUnlockFile} 
                onRemovePassword={async () => true} 
                color="emerald" 
            />
        )}
        
        <ImportPreviewModal isOpen={showImportPreview} candidates={importCandidates} onClose={() => { setShowImportPreview(false); setImportCandidates([]); }} onConfirm={handleConfirmImport} logos={customLogos} color={themeColor} />
        {showExportModal && <BatchExportModal accounts={selectedIds.size > 0 ? accounts.filter(a => selectedIds.has(a.id)) : accounts} onClose={() => setShowExportModal(false)} color={themeColor} />}
      </div>
    </LanguageContext.Provider>
  );
};

export default App;