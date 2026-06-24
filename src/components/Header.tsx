import { motion, AnimatePresence } from "motion/react";
import { Menu, X, PlusSquare, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useServices } from "../hooks/useServices";
import { useContent } from "../hooks/useContent";
import { useLang, LangCode } from "../context/LangContext";
import { useCmsField, useT } from "../hooks/useT";
import * as LucideIcons from "lucide-react";

interface HeaderCmsData {
  navItems: { name: string; href: string; translations?: Record<string, string> }[];
  navItems_lv?: { name: string; href: string }[]; // legacy
  bookingButtonText: string;
  bookingButtonText_lv?: string;
  bookingButtonTextMobile: string;
  bookingButtonTextMobile_lv?: string;
}

const defaultHeaderData: HeaderCmsData = {
  navItems: [
    { name: "Главная", href: "/" },
    { name: "Обучение", href: "/training" },
    { name: "Магазин", href: "/shop" },
    { name: "Услуги", href: "/services" },
  ],
  bookingButtonText: "Записаться",
  bookingButtonTextMobile: "Записаться онлайн",
};

// Map common Russian nav names to static translation keys (fallback only)
// Used when CMS nav items don't have inline translations stored
const NAV_STATIC_KEYS: Record<string, string> = {
  "Главная": "nav.home",
  "Обучение": "nav.training",
  "Магазин": "nav.shop",
  "Услуги": "nav.services",
  "Наши работы": "nav.works",
  "О нас": "nav.about",
  "Контакты": "nav.contacts",
  "Блог": "nav.blog",
};

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { lang, setLang, languages } = useLang();
  const t = useT();
  const f = useCmsField();
  
  const { services } = useServices();
  const { data: headerData } = useContent<HeaderCmsData>("content/header", defaultHeaderData);

  const cms = headerData || defaultHeaderData;

  const currentLang = languages.find((l) => l.code === lang) || languages[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleNavClick = (e: any, href: string) => {
    if (href.startsWith("#")) {
      if (location.pathname !== "/") {
        e.preventDefault();
        navigate("/" + href);
      }
    }
    setIsMenuOpen(false);
  };

  // Build navLinks from CMS data, marking the services link for dropdown
  const navLinks = (cms.navItems || defaultHeaderData.navItems).map((item) => {
    let resolvedName = item.name; // RU default

    if (lang !== 'ru') {
      // 1. Inline CMS translation (most reliable)
      const inlineTranslation = item.translations?.[lang];
      if (inlineTranslation) {
        resolvedName = inlineTranslation;
      }
      // 2. Legacy LV array fallback
      else if (lang === 'lv') {
        const legacyLvItems = cms.navItems_lv || [];
        const legacyIdx = (cms.navItems || []).indexOf(item);
        const lvItem = legacyLvItems[legacyIdx];
        if (lvItem?.name) resolvedName = lvItem.name;
        else {
          // 3. Static translations by common Russian names
          const staticKey = NAV_STATIC_KEYS[item.name];
          if (staticKey) resolvedName = t(staticKey);
        }
      }
      // 3. Static translations for any lang (EN, UK, LT, ET, ES)
      else {
        const staticKey = NAV_STATIC_KEYS[item.name];
        if (staticKey) resolvedName = t(staticKey);
      }
    }

    return {
      ...item,
      resolvedName: resolvedName || item.name,
      hasDropdown: item.href === '/services',
    };
  });
  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-white/80 backdrop-blur-xl px-6 sm:px-12 lg:px-40 py-4">
      <div className="flex items-center justify-between max-w-[1200px] mx-auto">
        <Link to="/" className="flex items-center gap-3 text-primary group">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
            <PlusSquare size={24} />
          </div>
          <span className="text-slate-900 text-xl font-bold leading-tight tracking-tight">
            SKINLAB
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <div 
              key={link.resolvedName} 
              className="relative group/nav"
              onMouseEnter={() => link.hasDropdown && setIsServicesOpen(true)}
              onMouseLeave={() => link.hasDropdown && setIsServicesOpen(false)}
            >
              <div className="flex items-center gap-1">
                {link.href.startsWith("/") ? (
                  <Link
                    to={link.href}
                    className="text-slate-600 text-sm font-bold hover:text-primary transition-colors"
                  >
                    {link.resolvedName}
                  </Link>
                ) : (
                  <a
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="text-slate-600 text-sm font-bold hover:text-primary transition-colors"
                  >
                    {link.resolvedName}
                  </a>
                )}
                {link.hasDropdown && (
                  <div className="text-slate-400 group-hover/nav:text-primary transition-colors">
                    <ChevronDown size={14} />
                  </div>
                )}
              </div>

              {link.hasDropdown && (
                <div 
                  className={`absolute top-full left-1/2 -translate-x-1/2 pt-4 transition-all duration-300 ${isServicesOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}
                >
                  <div className="bg-white border border-slate-100 shadow-2xl rounded-2xl p-4 min-w-[240px] grid gap-2">
                    {services.map((s) => {
                      const Icon = (LucideIcons as any)[s.iconName || 'Sparkles'] || LucideIcons.Sparkles;
                      return (
                        <Link
                          key={s.id}
                          to={`/service/${s.id}`}
                          onClick={() => setIsServicesOpen(false)}
                          className="text-sm text-slate-600 hover:text-primary hover:bg-primary/5 p-2 rounded-lg transition-all flex items-center gap-3"
                        >
                          <Icon size={16} className="text-primary/60 shrink-0" />
                          <span className="break-words">{f(s, 'title')}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link 
            to="/booking"
            onClick={() => setIsMenuOpen(false)}
            className="hidden sm:flex items-center justify-center rounded-full h-11 px-8 bg-primary text-white text-sm font-bold shadow-lg hover:brightness-95 transition-all"
          >
            {f(cms, 'bookingButtonText', t('nav.book'))}
          </Link>

          {/* Language Switcher — hidden on mobile, visible sm+ */}
          <div ref={langRef} className="relative hidden sm:block">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-1.5 h-10 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 transition-all"
              aria-label="Change language"
            >
              <span className="text-base leading-none">{currentLang.flag}</span>
              <span className="hidden sm:inline text-xs font-semibold text-slate-600 uppercase">
                {currentLang.code}
              </span>
              <ChevronDown
                size={12}
                className={`text-slate-400 transition-transform duration-200 ${isLangOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {isLangOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 min-w-[180px] z-50"
                >
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setIsLangOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                        lang === l.code
                          ? "bg-primary/8 text-primary font-semibold"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <span className="text-lg leading-none">{l.flag}</span>
                      <span className="flex-1 text-left">{l.label}</span>
                      {lang === l.code && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button 
            className="md:hidden text-slate-800 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-100 p-8 flex flex-col gap-6 shadow-2xl"
        >
          {navLinks.map((link) => (
            <div key={link.resolvedName} className="flex flex-col gap-4">
              {link.href.startsWith("/") ? (
                <Link to={link.href} onClick={() => setIsMenuOpen(false)} className="text-slate-800 text-lg font-bold hover:text-primary transition-colors">
                  {link.resolvedName}
                </Link>
              ) : (
                <a href={link.href} onClick={(e) => handleNavClick(e, link.href)} className="text-slate-800 text-lg font-bold hover:text-primary transition-colors">
                  {link.resolvedName}
                </a>
              )}
              {link.hasDropdown && (
                <div className="grid grid-cols-1 gap-2 pl-4 border-l-2 border-primary/10">
                  {services.map((s) => (
                    <Link key={s.id} to={`/service/${s.id}`} onClick={() => setIsMenuOpen(false)} className="text-sm text-slate-500 hover:text-primary py-1 break-words">
                      {f(s, 'title')}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setIsMenuOpen(false); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all ${
                  lang === l.code
                    ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent"
                }`}
              >
                <span className="text-base">{l.flag}</span>
                <span className="uppercase text-xs font-bold">{l.code}</span>
              </button>
            ))}
          </div>

          <Link 
            to="/booking"
            onClick={() => setIsMenuOpen(false)}
            className="w-full rounded-2xl h-14 bg-primary text-white text-base font-bold shadow-lg flex items-center justify-center"
          >
            {f(cms, 'bookingButtonTextMobile', t('nav.bookOnline'))}
          </Link>
        </motion.div>
      )}
    </header>
  );
}
