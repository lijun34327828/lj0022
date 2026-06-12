import { useState, useRef, useEffect } from 'react';
import { ArrowRightLeft, Globe, ChevronDown, Search } from 'lucide-react';
import useAppStore from '../store/index.js';
import { LANGUAGES, Language } from '../../shared/types.js';

interface LanguageSelectorProps {
  showDialect?: boolean;
}

export const LanguageSelector = ({ showDialect = true }: LanguageSelectorProps) => {
  const { sourceLanguage, targetLanguage, sourceDialect, setSourceLanguage, setTargetLanguage, setSourceDialect, swapLanguages } =
    useAppStore();
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);
  const [showDialectDropdown, setShowDialectDropdown] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const sourceDropdownRef = useRef<HTMLDivElement>(null);
  const targetDropdownRef = useRef<HTMLDivElement>(null);
  const dialectDropdownRef = useRef<HTMLDivElement>(null);

  const standardLanguages = LANGUAGES.filter((lang) => lang.type === 'standard');
  const dialects = LANGUAGES.filter((lang) => lang.type === 'dialect');

  const filteredSourceLanguages = standardLanguages.filter((lang) =>
    lang.name.toLowerCase().includes(sourceSearch.toLowerCase())
  );

  const filteredTargetLanguages = standardLanguages.filter((lang) =>
    lang.name.toLowerCase().includes(targetSearch.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target as Node)) {
        setShowSourceDropdown(false);
      }
      if (targetDropdownRef.current && !targetDropdownRef.current.contains(e.target as Node)) {
        setShowTargetDropdown(false);
      }
      if (dialectDropdownRef.current && !dialectDropdownRef.current.contains(e.target as Node)) {
        setShowDialectDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLanguageName = (code: string): string => {
    const lang = LANGUAGES.find((l) => l.code === code);
    return lang?.name || code;
  };

  const getDialectName = (code: string): string => {
    const dialect = dialects.find((d) => d.code === code);
    return dialect?.name || '无';
  };

  const handleSourceSelect = (lang: Language) => {
    setSourceLanguage(lang.code);
    setShowSourceDropdown(false);
    setSourceSearch('');
    if (lang.type !== 'standard') {
      setSourceDialect(undefined);
    }
  };

  const handleTargetSelect = (lang: Language) => {
    setTargetLanguage(lang.code);
    setShowTargetDropdown(false);
    setTargetSearch('');
  };

  const handleDialectSelect = (dialect: Language) => {
    setSourceDialect(dialect.code);
    setShowDialectDropdown(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="flex-1 relative" ref={sourceDropdownRef}>
          <button
            onClick={() => setShowSourceDropdown(!showSourceDropdown)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-white/10 hover:border-blue-500/30 transition-all duration-300 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-left">
                <p className="text-sm text-slate-400">源语言</p>
                <p className="text-white font-medium">{getLanguageName(sourceLanguage)}</p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                showSourceDropdown ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showSourceDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 max-h-80 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
              <div className="p-3 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                    placeholder="搜索语言..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-700/50 border border-white/10 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filteredSourceLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleSourceSelect(lang)}
                    className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors ${
                      sourceLanguage === lang.code ? 'bg-blue-500/20 text-blue-400' : 'text-white'
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
                {filteredSourceLanguages.length === 0 && (
                  <div className="px-4 py-8 text-center text-slate-400 text-sm">
                    未找到匹配的语言
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={swapLanguages}
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 hover:border-blue-500/30 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group"
        >
          <ArrowRightLeft className="w-5 h-5 text-blue-400 group-hover:text-white transition-colors" />
        </button>

        <div className="flex-1 relative" ref={targetDropdownRef}>
          <button
            onClick={() => setShowTargetDropdown(!showTargetDropdown)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-white/10 hover:border-purple-500/30 transition-all duration-300 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-left">
                <p className="text-sm text-slate-400">目标语言</p>
                <p className="text-white font-medium">{getLanguageName(targetLanguage)}</p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                showTargetDropdown ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showTargetDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 max-h-80 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
              <div className="p-3 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={targetSearch}
                    onChange={(e) => setTargetSearch(e.target.value)}
                    placeholder="搜索语言..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-700/50 border border-white/10 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filteredTargetLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleTargetSelect(lang)}
                    className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors ${
                      targetLanguage === lang.code ? 'bg-purple-500/20 text-purple-400' : 'text-white'
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
                {filteredTargetLanguages.length === 0 && (
                  <div className="px-4 py-8 text-center text-slate-400 text-sm">
                    未找到匹配的语言
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showDialect && sourceLanguage === 'zh-CN' && (
        <div className="relative" ref={dialectDropdownRef}>
          <button
            onClick={() => setShowDialectDropdown(!showDialectDropdown)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-sm border border-white/10 hover:border-amber-500/30 transition-all duration-300 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-left">
                <p className="text-sm text-slate-400">方言选择（可选）</p>
                <p className="text-white font-medium">{getDialectName(sourceDialect || '')}</p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${
                showDialectDropdown ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showDialectDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 max-h-60 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
              <button
                onClick={() => {
                  setSourceDialect(undefined);
                  setShowDialectDropdown(false);
                }}
                className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors ${
                  !sourceDialect ? 'bg-amber-500/20 text-amber-400' : 'text-white'
                }`}
              >
                无（标准普通话）
              </button>
              {dialects.map((dialect) => (
                <button
                  key={dialect.code}
                  onClick={() => handleDialectSelect(dialect)}
                  className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors ${
                    sourceDialect === dialect.code ? 'bg-amber-500/20 text-amber-400' : 'text-white'
                  }`}
                >
                  {dialect.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
