import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ImageUploader from '../../components/admin/ImageUploader';
import { motion } from 'motion/react';
import { Save, Plus, Trash2, ChevronDown, ChevronUp, Eye, Languages, Globe } from 'lucide-react';

// Language label map for UI
const LANG_LABELS: Record<string, string> = {
  ru: '🇷🇺 RU',
  lv: '🇱🇻 LV',
  en: '🇬🇧 EN',
  uk: '🇺🇦 UK',
  lt: '🇱🇹 LT',
  et: '🇪🇪 ET',
  es: '🇪🇸 ES',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeroSlide {
  id: string;
  title: string;
  title_lv?: string;
  title_en?: string;
  title_uk?: string;
  title_lt?: string;
  title_et?: string;
  title_es?: string;
  treatment: string;
  treatment_lv?: string;
  treatment_en?: string;
  description: string;
  description_lv?: string;
  description_en?: string;
  description_uk?: string;
  description_lt?: string;
  description_et?: string;
  description_es?: string;
  image: string;
  [key: string]: any; // allow dynamic _lang field access
}

interface AboutContent {
  name: string;
  name_lv?: string;
  title: string;
  title_lv?: string;
  regNumber: string;
  subtitle: string;
  subtitle_lv?: string;
  text: string;
  text_lv?: string;
  text2: string;
  text2_lv?: string;
  image: string; // Unified: changed from imageUrl to image
  stats: { value: string; label: string }[];
  stats_lv?: { value: string; label: string }[];
  buttonText: string;
  buttonText_lv?: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

interface CtaContent {
  title: string;
  title_lv?: string;
  subtitle: string;
  subtitle_lv?: string;
  buttonText: string;
  buttonText_lv?: string;
}

interface NavItem {
  name: string;
  href: string;
  translations?: Record<string, string>; // { lv: 'Sākums', en: 'Home', ... }
}

interface HeaderContent {
  navItems: NavItem[];
  navItems_lv?: NavItem[]; // legacy – kept for backward compat on load
  bookingButtonText: string;
  bookingButtonText_lv?: string;
  bookingButtonTextMobile: string;
  bookingButtonTextMobile_lv?: string;
}

interface ServicesSectionContent {
  label: string;
  label_lv?: string;
  title: string;
  title_lv?: string;
  subtitle: string;
  subtitle_lv?: string;
  learnMoreText: string;
  learnMoreText_lv?: string;
  viewAllText: string;
  viewAllText_lv?: string;
  detailButtonText: string;
  detailButtonText_lv?: string;
}

interface FooterContent {
  brandDescription: string;
  brandDescription_lv?: string;
  contactsTitle: string;
  contactsTitle_lv?: string;
  scheduleTitle: string;
  scheduleTitle_lv?: string;
  scheduleWeekdays: string;
  scheduleWeekdays_lv?: string;
  scheduleWeekends: string;
  scheduleWeekends_lv?: string;
  infoTitle: string;
  infoTitle_lv?: string;
  copyright: string;
  copyright_lv?: string;
  madeWith: string;
  madeWith_lv?: string;
  infoLinks: { name: string; href: string }[];
  infoLinks_lv?: { name: string; href: string }[];
}

/** 
 * Unified section content type. 
 * We use Partial to allow checking for properties safely.
 */
interface ContentSection extends Partial<AboutContent>, Partial<CtaContent>, Partial<HeaderContent>, Partial<ServicesSectionContent>, Partial<FooterContent> {
  mainTitle?: string;
  mainTitle_lv?: string;
  slides?: HeroSlide[];
  items?: FaqItem[];
  items_lv?: FaqItem[];
  image?: string; // Explicitly ensure image exists in the base type
}

type TabId = 'hero' | 'about' | 'faq' | 'cta' | 'header' | 'services_section' | 'footer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function AdminCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-6 py-4 border-b border-white/5 hover:bg-white/2 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-white font-semibold text-sm">{title}</h2>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </button>
      {open && <div className="p-6">{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:bg-white/8 transition-all text-sm';

const textareaClass = inputClass + ' resize-none leading-relaxed';

/** Dual-language text field with RU/LV inputs */
function LangField({ 
  label, 
  value, 
  valueLv, 
  onChange, 
  onChangeLv, 
  showLv, 
  multiline = false, 
  rows = 3,
  placeholder,
}: { 
  label: string; 
  value: string; 
  valueLv?: string; 
  onChange: (v: string) => void; 
  onChangeLv: (v: string) => void; 
  showLv: boolean;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  if (!showLv) {
    return (
      <Field label={label}>
        {multiline ? (
          <textarea rows={rows} className={textareaClass} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        ) : (
          <input className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        )}
      </Field>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="relative">
          <span className="absolute right-3 top-3 text-[10px] font-bold text-slate-600 uppercase pointer-events-none">RU</span>
          {multiline ? (
            <textarea rows={rows} className={textareaClass + ' pr-10'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
          ) : (
            <input className={inputClass + ' pr-10'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
          )}
        </div>
        <div className="relative">
          <span className="absolute right-3 top-3 text-[10px] font-bold text-emerald-500/60 uppercase pointer-events-none">LV</span>
          {multiline ? (
            <textarea rows={rows} className={textareaClass + ' pr-10 border-emerald-500/20'} value={valueLv || ''} onChange={(e) => onChangeLv(e.target.value)} placeholder={`${placeholder || label} (latviski)`} />
          ) : (
            <input className={inputClass + ' pr-10 border-emerald-500/20'} value={valueLv || ''} onChange={(e) => onChangeLv(e.target.value)} placeholder={`${placeholder || label} (latviski)`} />
          )}
        </div>
      </div>
    </div>
  );
}

/** Multi-language field - shows input for each enabled language */
function MultiLangField({
  label,
  baseValue,
  onBaseChange,
  getTranslation,
  onTranslationChange,
  enabledLangs,
  multiline = false,
  rows = 3,
  placeholder,
}: {
  label: string;
  baseValue: string;
  onBaseChange: (v: string) => void;
  getTranslation: (lang: string) => string;
  onTranslationChange: (lang: string, v: string) => void;
  enabledLangs: string[];
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  const transLangs = enabledLangs.filter(l => l !== 'ru');
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</label>
      <div className="flex flex-col gap-1.5">
        {/* RU base field */}
        <div className="relative">
          <span className="absolute right-3 top-3 text-[10px] font-bold text-slate-500 uppercase pointer-events-none">RU</span>
          {multiline ? (
            <textarea rows={rows} className={textareaClass + ' pr-10'} value={baseValue} onChange={(e) => onBaseChange(e.target.value)} placeholder={placeholder} />
          ) : (
            <input className={inputClass + ' pr-10'} value={baseValue} onChange={(e) => onBaseChange(e.target.value)} placeholder={placeholder} />
          )}
        </div>
        {/* Language-specific fields */}
        {transLangs.map(lang => (
          <div key={lang} className="relative">
            <span className="absolute right-3 top-3 text-[10px] font-bold text-emerald-500/60 uppercase pointer-events-none">{lang.toUpperCase()}</span>
            {multiline ? (
              <textarea rows={rows} className={textareaClass + ' pr-10 border-emerald-500/20'} value={getTranslation(lang)} onChange={(e) => onTranslationChange(lang, e.target.value)} placeholder={`${placeholder || label} (${LANG_LABELS[lang] || lang})`} />
            ) : (
              <input className={inputClass + ' pr-10 border-emerald-500/20'} value={getTranslation(lang)} onChange={(e) => onTranslationChange(lang, e.target.value)} placeholder={`${placeholder || label} (${LANG_LABELS[lang] || lang})`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContentEditor() {
  const [activeTab, setActiveTab] = useState<TabId>('hero');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showLv, setShowLv] = useState(false);
  const [enabledLangs, setEnabledLangs] = useState<string[]>(['ru', 'lv']);

  // Subscribe to enabled languages from Firestore settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.enabledLanguages && Array.isArray(d.enabledLanguages)) {
          setEnabledLangs(d.enabledLanguages);
        }
      }
    });
    return unsub;
  }, []);

  // Non-RU enabled languages for translation fields
  const transLangs = enabledLangs.filter(l => l !== 'ru');

  // Unified site content state
  const [siteContent, setSiteContent] = useState<Record<TabId, ContentSection>>({
    hero: { mainTitle: '', mainTitle_lv: '', slides: [] },
    about: { name: '', title: '', regNumber: '', subtitle: '', text: '', text2: '', image: '', stats: [], buttonText: 'Подробнее' },
    faq: { mainTitle: '', mainTitle_lv: '', items: [], items_lv: [] },
    cta: { title: '', subtitle: '', buttonText: '' },
    header: { 
      navItems: [
        { name: 'Главная', href: '/' },
        { name: 'Обучение', href: '/training' },
        { name: 'Магазин', href: '/shop' },
        { name: 'Услуги', href: '/services' },
      ],
      bookingButtonText: 'Записаться',
      bookingButtonTextMobile: 'Записаться онлайн',
    },
    services_section: {
      label: 'Программы', title: 'Услуги и цены',
      subtitle: 'Персональный подход к вашему здоровью и красоте.',
      learnMoreText: 'Подробнее', viewAllText: 'Смотреть все услуги', detailButtonText: 'Подробнее',
    },
    footer: {
      brandDescription: 'Эстетическая косметология и профессиональный уход.\nАнастасия Букина, косметолог\n(ID: 59850068090)',
      contactsTitle: 'Контакты',
      scheduleTitle: 'Режим работы',
      scheduleWeekdays: 'Пн - Пт: 09:00 - 20:00',
      scheduleWeekends: 'Сб - Вс: по предварительной записи',
      infoTitle: 'Информация',
      copyright: '© {year} SKINLAB. Все права защищены.',
      madeWith: 'Разработано с ❤️',
      infoLinks: [
        { name: 'Юридическая информация', href: '/legal-notice' },
        { name: 'Политика конфиденциальности', href: '/privacy-policy' },
        { name: 'Правила предоставления услуг', href: '/terms-of-service' },
        { name: 'Политика cookie', href: '/cookie-policy' },
      ],
    }
  });

  useEffect(() => {
    loadContent();
  }, [activeTab]);

  async function loadContent() {
    try {
      const snap = await getDoc(doc(db, 'content', activeTab));
      if (!snap.exists()) return;
      const data = snap.data() as ContentSection;

      // Compatibility check: if about has imageUrl, map it to image
      if (activeTab === 'about' && (data as any).imageUrl) {
        data.image = (data as any).imageUrl;
      }

      setSiteContent(prev => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], ...data }
      }));
    } catch (e) {
      console.error('Load content error:', e);
    }
  }

  async function save() {
    setSaving(true);
    setSaveMsg('');
    try {
      const content = siteContent[activeTab];
      let payload: any = { ...content };

      if (activeTab === 'hero' && content.slides) {
        // Sanitize slides
        payload.slides = content.slides.map(slide => ({
          id: slide.id || `slide-${Math.random().toString(36).substr(2, 9)}`,
          title: slide.title || '',
          title_lv: slide.title_lv || '',
          treatment: slide.treatment || '',
          treatment_lv: slide.treatment_lv || '',
          description: slide.description || '',
          description_lv: slide.description_lv || '',
          image: slide.image || '',
        }));
      }

      // Final sanitization: convert all undefined to empty string
      const cleanPayload = JSON.parse(JSON.stringify(payload, (_, v) => v === undefined ? '' : v));

      await setDoc(doc(db, 'content', activeTab), cleanPayload, { merge: true });
      setSaveMsg('Сохранено ✓');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e: any) {
      console.error('Save error details:', e);
      setSaveMsg(`Ошибка: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'hero', label: 'Hero' },
    { id: 'about', label: 'О нас' },
    { id: 'faq', label: 'FAQ' },
    { id: 'cta', label: 'CTA' },
    { id: 'header', label: 'Хедер' },
    { id: 'services_section', label: 'Секция услуг' },
    { id: 'footer', label: 'Футер' },
  ];

  const content = siteContent[activeTab];

  // ─── Bridge Helpers for JSX ────────────────────────────────────────────────
  // These variables and setters bridge the unified state back to the names
  // used in the legacy JSX sections.

  const heroMainTitle = siteContent.hero.mainTitle || '';
  const heroMainTitle_lv = siteContent.hero.mainTitle_lv || '';
  const heroSlides = siteContent.hero.slides || [];

  const about = siteContent.about;
  const faqMainTitle = siteContent.faq.mainTitle || '';
  const faqMainTitle_lv = siteContent.faq.mainTitle_lv || '';
  const faqItems = siteContent.faq.items || [];
  const faqItems_lv = siteContent.faq.items_lv || [];

  const cta = siteContent.cta;
  const header = siteContent.header;
  const servicesSection = siteContent.services_section;
  const footer = siteContent.footer;

  // Generic updater function
  const updateSection = (tab: TabId, updates: any) => {
    setSiteContent(prev => ({
      ...prev,
      [tab]: typeof updates === 'function' ? updates(prev[tab]) : { ...prev[tab], ...updates }
    }));
  };

  // Specific setters used by JSX
  const setHeroMainTitle = (v: string) => updateSection('hero', { mainTitle: v });
  const setHeroMainTitleLv = (v: string) => updateSection('hero', { mainTitle_lv: v });
  const setHeroSlides = (fn: any) => updateSection('hero', (prev: any) => ({ 
    ...prev, 
    slides: typeof fn === 'function' ? fn(prev.slides || []) : fn 
  }));

  const setAbout = (updates: any) => updateSection('about', updates);
  
  const setFaqMainTitle = (v: string) => updateSection('faq', { mainTitle: v });
  const setFaqMainTitleLv = (v: string) => updateSection('faq', { mainTitle_lv: v });
  const setFaqItems = (fn: any) => updateSection('faq', (prev: any) => ({ 
    ...prev, 
    items: typeof fn === 'function' ? fn(prev.items || []) : fn 
  }));
  const setFaqItemsLv = (fn: any) => updateSection('faq', (prev: any) => ({ 
    ...prev, 
    items_lv: typeof fn === 'function' ? fn(prev.items_lv || []) : fn 
  }));

  const setCta = (updates: any) => updateSection('cta', updates);
  const setHeader = (updates: any) => updateSection('header', updates);
  const setServicesSection = (updates: any) => updateSection('services_section', updates);
  const setFooter = (updates: any) => updateSection('footer', updates);


  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Контент сайта</h1>
          <p className="text-slate-400 text-sm mt-1">Редактируйте тексты и изображения</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Language toggle */}
          <button
            onClick={() => setShowLv(!showLv)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              showLv
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Languages size={14} />
            {showLv ? 'RU + LV' : 'Только RU'}
          </button>
          {saveMsg && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-sm ${saveMsg.startsWith('Ошибка') ? 'text-red-400' : 'text-green-400'}`}
            >
              {saveMsg}
            </motion.span>
          )}
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white text-sm transition-all"
          >
            <Eye size={14} />
            Предпросмотр
          </a>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 transition-all"
          >
            <Save size={14} />
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 mb-6 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── HERO ── */}
      {activeTab === 'hero' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
            <MultiLangField
              label="Главный заголовок блока Hero"
              baseValue={heroMainTitle}
              onBaseChange={setHeroMainTitle}
              getTranslation={(lang) => siteContent.hero[`mainTitle_${lang}`] || ''}
              onTranslationChange={(lang, v) => updateSection('hero', { [`mainTitle_${lang}`]: v })}
              enabledLangs={enabledLangs}
              placeholder="Заголовок для всего слайдера..."
            />
          </div>
          
          {heroSlides.map((slide, i) => (
            <div key={i} className="bg-white/3 border border-white/8 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <span className="text-white font-medium text-sm">Слайд {i + 1}</span>
                <button
                  onClick={() => setHeroSlides((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-4">
                  <MultiLangField
                    label="Заголовок"
                    baseValue={slide.title}
                    onBaseChange={(v) => setHeroSlides((prev) => prev.map((s, idx) => idx === i ? { ...s, title: v } : s))}
                    getTranslation={(lang) => slide[`title_${lang}`] || ''}
                    onTranslationChange={(lang, v) => setHeroSlides((prev) => prev.map((s, idx) => idx === i ? { ...s, [`title_${lang}`]: v } : s))}
                    enabledLangs={enabledLangs}
                  />
                  <MultiLangField
                    label="Название процедуры"
                    baseValue={slide.treatment}
                    onBaseChange={(v) => setHeroSlides((prev) => prev.map((s, idx) => idx === i ? { ...s, treatment: v } : s))}
                    getTranslation={(lang) => slide[`treatment_${lang}`] || ''}
                    onTranslationChange={(lang, v) => setHeroSlides((prev) => prev.map((s, idx) => idx === i ? { ...s, [`treatment_${lang}`]: v } : s))}
                    enabledLangs={enabledLangs}
                  />
                  <MultiLangField
                    label="Описание"
                    baseValue={slide.description}
                    onBaseChange={(v) => setHeroSlides((prev) => prev.map((s, idx) => idx === i ? { ...s, description: v } : s))}
                    getTranslation={(lang) => slide[`description_${lang}`] || ''}
                    onTranslationChange={(lang, v) => setHeroSlides((prev) => prev.map((s, idx) => idx === i ? { ...s, [`description_${lang}`]: v } : s))}
                    enabledLangs={enabledLangs}
                    multiline
                    rows={3}
                  />
                </div>
                <div>
                  <Field label="Изображение">
                    <ImageUploader
                      currentUrl={slide.image}
                      storagePath={`hero/slide-${i}`}
                      onUpload={(url) => setHeroSlides((prev) => prev.map((s, idx) => idx === i ? { ...s, image: url } : s))}
                    />
                  </Field>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => setHeroSlides((prev) => [...prev, { id: '', title: '', treatment: '', description: '', image: '' }])}
            className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-slate-400 hover:text-white hover:border-white/20 transition-all text-sm"
          >
            <Plus size={16} />
            Добавить слайд
          </button>
        </div>
      )}

      {/* ── ABOUT ── */}
      {activeTab === 'about' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-4">
              <LangField label="Имя" value={about.name} valueLv={about.name_lv} onChange={(v) => setAbout({ ...about, name: v })} onChangeLv={(v) => setAbout({ ...about, name_lv: v })} showLv={showLv} />
              <LangField label="Должность / Заголовок" value={about.title} valueLv={about.title_lv} onChange={(v) => setAbout({ ...about, title: v })} onChangeLv={(v) => setAbout({ ...about, title_lv: v })} showLv={showLv} />
              <Field label="Регистрационный номер">
                <input className={inputClass} value={about.regNumber} onChange={(e) => setAbout({ ...about, regNumber: e.target.value })} />
              </Field>
              <LangField label="Подзаголовок" value={about.subtitle} valueLv={about.subtitle_lv} onChange={(v) => setAbout({ ...about, subtitle: v })} onChangeLv={(v) => setAbout({ ...about, subtitle_lv: v })} showLv={showLv} />
              <LangField label="Основной текст (абзац 1)" value={about.text} valueLv={about.text_lv} onChange={(v) => setAbout({ ...about, text: v })} onChangeLv={(v) => setAbout({ ...about, text_lv: v })} showLv={showLv} multiline rows={4} />
              <LangField label="Основной текст (абзац 2)" value={about.text2} valueLv={about.text2_lv} onChange={(v) => setAbout({ ...about, text2: v })} onChangeLv={(v) => setAbout({ ...about, text2_lv: v })} showLv={showLv} multiline rows={4} />
            </div>
            <div>
              <Field label="Фото">
                <ImageUploader
                  currentUrl={about.image}
                  storagePath="general/about-photo"
                  onUpload={(url) => setAbout({ ...about, image: url })}
                />
              </Field>
            </div>
          </div>

          {/* Stats RU */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Статистика (RU)</span>
              <button
                onClick={() => setAbout({ ...about, stats: [...about.stats, { value: '', label: '' }] })}
                className="text-primary text-xs hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Добавить
              </button>
            </div>
            {about.stats.map((stat, i) => (
              <div key={i} className="flex gap-3 items-center">
                <input
                  placeholder="8+"
                  className={inputClass + ' w-24'}
                  value={stat.value}
                  onChange={(e) => setAbout({ ...about, stats: about.stats.map((s, idx) => idx === i ? { ...s, value: e.target.value } : s) })}
                />
                <input
                  placeholder="лет опыта"
                  className={inputClass + ' flex-1'}
                  value={stat.label}
                  onChange={(e) => setAbout({ ...about, stats: about.stats.map((s, idx) => idx === i ? { ...s, label: e.target.value } : s) })}
                />
                <button onClick={() => setAbout({ ...about, stats: about.stats.filter((_, idx) => idx !== i) })} className="text-slate-500 hover:text-red-400">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Stats LV */}
          {showLv && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-500/60 uppercase tracking-wider">Статистика (LV)</span>
                <button
                  onClick={() => setAbout({ ...about, stats_lv: [...(about.stats_lv || []), { value: '', label: '' }] })}
                  className="text-emerald-400 text-xs hover:underline flex items-center gap-1"
                >
                  <Plus size={12} /> Добавить
                </button>
              </div>
              {(about.stats_lv || []).map((stat, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <input
                    placeholder="8+"
                    className={inputClass + ' w-24 border-emerald-500/20'}
                    value={stat.value}
                    onChange={(e) => setAbout({ ...about, stats_lv: (about.stats_lv || []).map((s, idx) => idx === i ? { ...s, value: e.target.value } : s) })}
                  />
                  <input
                    placeholder="gadu pieredze"
                    className={inputClass + ' flex-1 border-emerald-500/20'}
                    value={stat.label}
                    onChange={(e) => setAbout({ ...about, stats_lv: (about.stats_lv || []).map((s, idx) => idx === i ? { ...s, label: e.target.value } : s) })}
                  />
                  <button onClick={() => setAbout({ ...about, stats_lv: (about.stats_lv || []).filter((_, idx) => idx !== i) })} className="text-slate-500 hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
            <LangField label="Текст кнопки" value={about.buttonText} valueLv={about.buttonText_lv} onChange={(v) => setAbout({ ...about, buttonText: v })} onChangeLv={(v) => setAbout({ ...about, buttonText_lv: v })} showLv={showLv} placeholder="Подробнее" />
          </div>
        </div>
      )}

      {/* ── FAQ ── */}
      {activeTab === 'faq' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
            <LangField
              label="Главный заголовок блока FAQ"
              value={faqMainTitle}
              valueLv={faqMainTitle_lv}
              onChange={setFaqMainTitle}
              onChangeLv={setFaqMainTitleLv}
              showLv={showLv}
              placeholder="Например: Частые вопросы"
            />
          </div>
          
          {faqItems.map((item, i) => (
            <div key={i} className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <span className="text-slate-500 text-xs font-medium pt-1">#{i + 1}</span>
                <button onClick={() => {
                  setFaqItems((prev) => prev.filter((_, idx) => idx !== i));
                  setFaqItemsLv((prev) => prev.filter((_, idx) => idx !== i));
                }} className="text-slate-500 hover:text-red-400 flex-shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <LangField
                  label="Вопрос"
                  value={item.question}
                  valueLv={faqItems_lv[i]?.question || ''}
                  onChange={(v) => setFaqItems((prev) => prev.map((f, idx) => idx === i ? { ...f, question: v } : f))}
                  onChangeLv={(v) => {
                    setFaqItemsLv((prev) => {
                      const updated = [...prev];
                      while (updated.length <= i) updated.push({ question: '', answer: '' });
                      updated[i] = { ...updated[i], question: v };
                      return updated;
                    });
                  }}
                  showLv={showLv}
                />
                <LangField
                  label="Ответ"
                  value={item.answer}
                  valueLv={faqItems_lv[i]?.answer || ''}
                  onChange={(v) => setFaqItems((prev) => prev.map((f, idx) => idx === i ? { ...f, answer: v } : f))}
                  onChangeLv={(v) => {
                    setFaqItemsLv((prev) => {
                      const updated = [...prev];
                      while (updated.length <= i) updated.push({ question: '', answer: '' });
                      updated[i] = { ...updated[i], answer: v };
                      return updated;
                    });
                  }}
                  showLv={showLv}
                  multiline
                  rows={3}
                />
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              setFaqItems((prev) => [...prev, { question: '', answer: '' }]);
              setFaqItemsLv((prev) => [...prev, { question: '', answer: '' }]);
            }}
            className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-white/10 rounded-2xl text-slate-400 hover:text-white hover:border-white/20 transition-all text-sm"
          >
            <Plus size={16} />
            Добавить вопрос
          </button>
        </div>
      )}

      {/* ── CTA ── */}
      {activeTab === 'cta' && (
        <div className="flex flex-col gap-5 bg-white/3 border border-white/8 rounded-2xl p-6">
          <LangField label="Заголовок" value={cta.title} valueLv={cta.title_lv} onChange={(v) => setCta({ ...cta, title: v })} onChangeLv={(v) => setCta({ ...cta, title_lv: v })} showLv={showLv} />
          <LangField label="Подзаголовок" value={cta.subtitle} valueLv={cta.subtitle_lv} onChange={(v) => setCta({ ...cta, subtitle: v })} onChangeLv={(v) => setCta({ ...cta, subtitle_lv: v })} showLv={showLv} />
          <LangField label="Текст кнопки" value={cta.buttonText} valueLv={cta.buttonText_lv} onChange={(v) => setCta({ ...cta, buttonText: v })} onChangeLv={(v) => setCta({ ...cta, buttonText_lv: v })} showLv={showLv} />
        </div>
      )}

      {/* ── HEADER ── */}
      {activeTab === 'header' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white/3 border border-white/8 rounded-2xl p-6 flex flex-col gap-5">
            <LangField label="Текст кнопки записи (десктоп)" value={header.bookingButtonText} valueLv={header.bookingButtonText_lv} onChange={(v) => setHeader({ ...header, bookingButtonText: v })} onChangeLv={(v) => setHeader({ ...header, bookingButtonText_lv: v })} showLv={showLv} placeholder="Записаться" />
            <LangField label="Текст кнопки записи (мобильная)" value={header.bookingButtonTextMobile} valueLv={header.bookingButtonTextMobile_lv} onChange={(v) => setHeader({ ...header, bookingButtonTextMobile: v })} onChangeLv={(v) => setHeader({ ...header, bookingButtonTextMobile_lv: v })} showLv={showLv} placeholder="Записаться онлайн" />
          </div>

          {/* Nav items with per-language inline translations */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-slate-400" />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Пункты навигации</span>
              </div>
              <button
                onClick={() => setHeader({ ...header, navItems: [...header.navItems, { name: '', href: '/', translations: {} }] })}
                className="text-primary text-xs hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> Добавить пункт
              </button>
            </div>

            {/* Active languages hint */}
            {transLangs.length > 0 && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                <Languages size={13} className="text-emerald-400 shrink-0" />
                <span className="text-emerald-400/80 text-xs">
                  Активные языки перевода: {transLangs.map(l => LANG_LABELS[l] || l.toUpperCase()).join(', ')}. Заполните поля для каждого языка.
                </span>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {header.navItems.map((item, i) => (
                <div key={i} className="border border-white/8 rounded-xl p-4 flex flex-col gap-3">
                  {/* RU name + href */}
                  <div className="flex gap-3 items-center">
                    <div className="relative flex-1">
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 uppercase">RU</span>
                      <input
                        placeholder="Название (RU)"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 text-sm"
                        value={item.name}
                        onChange={(e) => setHeader({ ...header, navItems: header.navItems.map((n, idx) => idx === i ? { ...n, name: e.target.value } : n) })}
                      />
                    </div>
                    <input
                      placeholder="/path"
                      className="w-36 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 text-sm"
                      value={item.href}
                      onChange={(e) => setHeader({ ...header, navItems: header.navItems.map((n, idx) => idx === i ? { ...n, href: e.target.value } : n) })}
                    />
                    <button onClick={() => setHeader({ ...header, navItems: header.navItems.filter((_, idx) => idx !== i) })} className="text-slate-500 hover:text-red-400 flex-shrink-0">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Per-language translations — ALWAYS visible (not gated by showLv) */}
                  {transLangs.length === 0 && (
                    <p className="text-slate-600 text-xs">Нет активных языков перевода. Добавьте языки в настройках сайта.</p>
                  )}
                  {transLangs.map(lang => (
                    <div key={lang} className="relative">
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-500/70 uppercase">{LANG_LABELS[lang] || lang.toUpperCase()}</span>
                      <input
                        placeholder={`Название на ${LANG_LABELS[lang] || lang} (обязательно)`}
                        className="w-full bg-white/5 border border-emerald-500/20 rounded-xl px-4 py-2.5 pr-16 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 text-sm"
                        value={item.translations?.[lang] || ''}
                        onChange={(e) => setHeader({
                          ...header,
                          navItems: header.navItems.map((n, idx) =>
                            idx === i ? { ...n, translations: { ...(n.translations || {}), [lang]: e.target.value } } : n
                          )
                        })}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <p className="text-slate-500 text-xs px-1">* Пункт «Услуги» автоматически показывает выпадающее меню с категориями услуг.</p>
        </div>
      )}


      {/* ── SERVICES SECTION ── */}
      {activeTab === 'services_section' && (
        <div className="flex flex-col gap-5 bg-white/3 border border-white/8 rounded-2xl p-6">
          <p className="text-slate-500 text-xs">Эти тексты отображаются в блоке услуг на главной странице. Сами услуги и их данные редактируются в разделе «Услуги».</p>
          <LangField label="Подпись (label)" value={servicesSection.label} valueLv={servicesSection.label_lv} onChange={(v) => setServicesSection({ ...servicesSection, label: v })} onChangeLv={(v) => setServicesSection({ ...servicesSection, label_lv: v })} showLv={showLv} placeholder="Программы" />
          <LangField label="Заголовок секции" value={servicesSection.title} valueLv={servicesSection.title_lv} onChange={(v) => setServicesSection({ ...servicesSection, title: v })} onChangeLv={(v) => setServicesSection({ ...servicesSection, title_lv: v })} showLv={showLv} placeholder="Услуги и цены" />
          <LangField label="Описание секции" value={servicesSection.subtitle} valueLv={servicesSection.subtitle_lv} onChange={(v) => setServicesSection({ ...servicesSection, subtitle: v })} onChangeLv={(v) => setServicesSection({ ...servicesSection, subtitle_lv: v })} showLv={showLv} multiline rows={3} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LangField label="Текст кнопки «Подробнее» (карточка)" value={servicesSection.learnMoreText} valueLv={servicesSection.learnMoreText_lv} onChange={(v) => setServicesSection({ ...servicesSection, learnMoreText: v })} onChangeLv={(v) => setServicesSection({ ...servicesSection, learnMoreText_lv: v })} showLv={showLv} />
            <LangField label="Текст кнопки «Смотреть все»" value={servicesSection.viewAllText} valueLv={servicesSection.viewAllText_lv} onChange={(v) => setServicesSection({ ...servicesSection, viewAllText: v })} onChangeLv={(v) => setServicesSection({ ...servicesSection, viewAllText_lv: v })} showLv={showLv} />
          </div>
          <LangField label="Текст кнопки «Подробнее» (Hero слайдер)" value={servicesSection.detailButtonText} valueLv={servicesSection.detailButtonText_lv} onChange={(v) => setServicesSection({ ...servicesSection, detailButtonText: v })} onChangeLv={(v) => setServicesSection({ ...servicesSection, detailButtonText_lv: v })} showLv={showLv} placeholder="Подробнее" />
        </div>
      )}

      {/* ── FOOTER ── */}
      {activeTab === 'footer' && (
        <div className="flex flex-col gap-4">
          <div className="bg-white/3 border border-white/8 rounded-2xl p-6 flex flex-col gap-5">
            <LangField label="Описание бренда (под логотипом)" value={footer.brandDescription} valueLv={footer.brandDescription_lv} onChange={(v) => setFooter({ ...footer, brandDescription: v })} onChangeLv={(v) => setFooter({ ...footer, brandDescription_lv: v })} showLv={showLv} multiline rows={3} />
          </div>

          <div className="bg-white/3 border border-white/8 rounded-2xl p-6 flex flex-col gap-5">
            <LangField label="Заголовок блока контактов" value={footer.contactsTitle} valueLv={footer.contactsTitle_lv} onChange={(v) => setFooter({ ...footer, contactsTitle: v })} onChangeLv={(v) => setFooter({ ...footer, contactsTitle_lv: v })} showLv={showLv} />
            <p className="text-slate-500 text-xs">Телефон, email и адрес редактируются в разделе «Настройки».</p>
          </div>

          <div className="bg-white/3 border border-white/8 rounded-2xl p-6 flex flex-col gap-5">
            <LangField label="Заголовок «Режим работы»" value={footer.scheduleTitle} valueLv={footer.scheduleTitle_lv} onChange={(v) => setFooter({ ...footer, scheduleTitle: v })} onChangeLv={(v) => setFooter({ ...footer, scheduleTitle_lv: v })} showLv={showLv} />
            <LangField label="Будние дни" value={footer.scheduleWeekdays} valueLv={footer.scheduleWeekdays_lv} onChange={(v) => setFooter({ ...footer, scheduleWeekdays: v })} onChangeLv={(v) => setFooter({ ...footer, scheduleWeekdays_lv: v })} showLv={showLv} placeholder="Пн - Пт: 09:00 - 20:00" />
            <LangField label="Выходные" value={footer.scheduleWeekends} valueLv={footer.scheduleWeekends_lv} onChange={(v) => setFooter({ ...footer, scheduleWeekends: v })} onChangeLv={(v) => setFooter({ ...footer, scheduleWeekends_lv: v })} showLv={showLv} placeholder="Сб - Вс: по записи" />
          </div>

          <div className="bg-white/3 border border-white/8 rounded-2xl p-6 flex flex-col gap-5">
            <LangField label="Заголовок «Информация»" value={footer.infoTitle} valueLv={footer.infoTitle_lv} onChange={(v) => setFooter({ ...footer, infoTitle: v })} onChangeLv={(v) => setFooter({ ...footer, infoTitle_lv: v })} showLv={showLv} />

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Ссылки информации</span>
                <button
                  onClick={() => setFooter({ ...footer, infoLinks: [...(footer.infoLinks || []), { name: '', href: '/' }] })}
                  className="text-primary text-xs hover:underline flex items-center gap-1"
                >
                  <Plus size={12} /> Добавить
                </button>
              </div>
              {(footer.infoLinks || []).map((link, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <input
                    placeholder="Название"
                    className={inputClass + ' flex-1'}
                    value={link.name}
                    onChange={(e) => setFooter({ ...footer, infoLinks: footer.infoLinks.map((l, idx) => idx === i ? { ...l, name: e.target.value } : l) })}
                  />
                  <input
                    placeholder="/path"
                    className={inputClass + ' w-40'}
                    value={link.href}
                    onChange={(e) => setFooter({ ...footer, infoLinks: footer.infoLinks.map((l, idx) => idx === i ? { ...l, href: e.target.value } : l) })}
                  />
                  <button onClick={() => setFooter({ ...footer, infoLinks: footer.infoLinks.filter((_, idx) => idx !== i) })} className="text-slate-500 hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <LangField label="Текст копирайта" value={footer.copyright} valueLv={footer.copyright_lv} onChange={(v) => setFooter({ ...footer, copyright: v })} onChangeLv={(v) => setFooter({ ...footer, copyright_lv: v })} showLv={showLv} placeholder="© {year} SKINLAB. Все права защищены." />
            <p className="text-slate-500 text-xs">Используйте <code className="text-primary">{'{year}'}</code> для автоподстановки текущего года.</p>
            <LangField label="Текст «Разработано»" value={footer.madeWith} valueLv={footer.madeWith_lv} onChange={(v) => setFooter({ ...footer, madeWith: v })} onChangeLv={(v) => setFooter({ ...footer, madeWith_lv: v })} showLv={showLv} />
          </div>
        </div>
      )}
    </div>
  );
}
