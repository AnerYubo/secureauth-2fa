import React, { useState, useRef, useEffect } from 'react';
import { AppLogo } from '../types';
import { ChevronDown, Search, X, Check } from 'lucide-react';

interface LogoSelectProps {
  logos: AppLogo[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  color?: 'blue' | 'orange' | 'emerald';
}

const LogoSelect: React.FC<LogoSelectProps> = ({ logos, value, onChange, placeholder = "Select Logo", className = "", color = 'blue' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [lockedHeight, setLockedHeight] = useState<string | undefined>(undefined);
  
  const selectedLogo = logos.find(l => l.id === value);
  const filteredLogos = logos.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));

  // Theme styles
  const getThemeColor = () => {
      switch(color) {
          case 'emerald': return 'text-emerald-600 bg-emerald-50 border-emerald-200 ring-emerald-500 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400';
          case 'orange': return 'text-orange-600 bg-orange-50 border-orange-200 ring-orange-500 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-400';
          default: return 'text-blue-600 bg-blue-50 border-blue-200 ring-blue-500 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400';
      }
  };
  const activeClass = getThemeColor();

  const handleOpen = () => {
      setSearch("");
      setLockedHeight(undefined);
      setIsOpen(true);
  };

  useEffect(() => {
      if (isOpen) {
          // Measure height after render to lock it
          const timer = setTimeout(() => {
              if (containerRef.current) {
                  setLockedHeight(`${containerRef.current.offsetHeight}px`);
              }
          }, 10);
          return () => clearTimeout(timer);
      }
  }, [isOpen]);

  return (
    <>
      {/* Trigger Button */}
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={handleOpen}
          className="w-full flex items-center justify-between border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-700 text-left focus:ring-2 focus:ring-opacity-50 outline-none transition hover:border-gray-400 dark:hover:border-gray-500"
          style={{ borderColor: isOpen ? 'transparent' : '' }}
        >
          {selectedLogo ? (
              <div className="flex items-center gap-2">
                  <div className="w-5 h-5 shrink-0 bg-gray-50 dark:bg-gray-600 border dark:border-gray-500 rounded p-0.5 flex items-center justify-center">
                     <img src={selectedLogo.data} alt={selectedLogo.name} className="max-w-full max-h-full object-contain" />
                  </div>
                  <span className="truncate font-medium text-gray-700 dark:text-gray-200 text-sm">{selectedLogo.name}</span>
              </div>
          ) : (
              <span className="text-gray-500 dark:text-gray-400 text-sm">{placeholder}</span>
          )}
          <ChevronDown size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Drawer Portal (Fixed Overlay) */}
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex justify-center items-end sm:items-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Drawer Content */}
          <div 
            ref={containerRef}
            style={{ height: lockedHeight }}
            className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-xl shadow-2xl max-h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-300"
          >
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1 shrink-0 cursor-pointer" onClick={() => setIsOpen(false)}>
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full hover:bg-gray-400 transition" />
            </div>

            {/* Header with Search */}
            <div className="p-3 border-b dark:border-gray-700 shrink-0 flex gap-2 items-center">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                    <input
                        type="text"
                        className={`w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-transparent focus:bg-white dark:focus:bg-gray-600 border focus:ring-2 rounded-lg text-sm outline-none transition text-gray-900 dark:text-white ${color === 'orange' ? 'focus:border-orange-500 focus:ring-orange-200' : (color === 'emerald' ? 'focus:border-emerald-500 focus:ring-emerald-200' : 'focus:border-blue-500 focus:ring-blue-200')}`}
                        placeholder="Search logos..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300">
                    <X size={16} />
                </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
               <div 
                  className={`flex items-center justify-between p-2 cursor-pointer rounded-lg transition ${!value ? activeClass : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                  onClick={() => { onChange(""); setIsOpen(false); }}
               >
                  <span className="font-medium text-sm">No Logo (Default)</span>
                  {!value && <Check size={14} />}
               </div>

               {filteredLogos.map(logo => (
                   <div
                      key={logo.id}
                      className={`flex items-center justify-between p-2 cursor-pointer rounded-lg transition ${value === logo.id ? activeClass : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                      onClick={() => { onChange(logo.id); setIsOpen(false); }}
                   >
                      <div className="flex items-center gap-2">
                          <div className="w-8 h-8 shrink-0 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg p-0.5 flex items-center justify-center">
                              <img src={logo.data} alt={logo.name} className="max-w-full max-h-full object-contain" />
                          </div>
                          <span className="font-medium text-sm">{logo.name}</span>
                      </div>
                      {value === logo.id && <Check size={14} />}
                   </div>
               ))}

               {filteredLogos.length === 0 && (
                   <div className="p-6 text-center text-gray-400 flex flex-col items-center">
                       <Search size={24} className="mb-2 opacity-20" />
                       <p className="text-xs">No logos found</p>
                   </div>
               )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LogoSelect;