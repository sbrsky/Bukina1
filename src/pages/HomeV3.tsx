import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { servicesData } from "../data/servicesData";
import {
  ArrowRight,
  ChevronDown,
  Menu,
  X,
  MapPin,
  Phone,
  Mail,
  Volume2,
  VolumeX,
  PlusSquare,
} from "lucide-react";
import { useLang } from "../context/LangContext";

// ────────────────────────────────────────────────────────────────
// Design tokens — Medical White 2026
// ────────────────────────────────────────────────────────────────
const C = {
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  surfaceAlt: "#F5F4F0",
  border: "#E8E6E1",
  borderLight: "#F0EEE9",
  text: "#1A1814",
  textMid: "#5C5850",
  textMuted: "#9B9690",
  accent: "#1C2B3A",
  gold: "#B8966A",
  goldLight: "#D4AF82",
  tag: "#EAF1F7",
  tagText: "#2E4459",
};

// ────────────────────────────────────────────────────────────────
// HEADER
// ────────────────────────────────────────────────────────────────
function V3Header() {
  const { lang, setLang, languages } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentLang = languages.find((l) => l.code === lang);

  const navLinks = [
    { label: "Главная", href: "/v3" },
    { label: "Услуги", href: "/services" },
    { label: "Обучение", href: "/training" },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(250,250,248,0.97)" : "rgba(250,250,248,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: scrolled ? `1px solid ${C.border}` : "1px solid transparent",
      }}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-10 lg:px-16 h-16 flex items-center justify-between">

        <Link to="/v3" className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.accent }}>
            <PlusSquare size={16} color="#fff" />
          </div>
          <span className="text-base font-bold tracking-tight" style={{ color: C.text }}>SKINLAB</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((l) => (
            <Link key={l.href} to={l.href} className="text-sm font-medium transition-colors hover:opacity-60" style={{ color: C.textMid }}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: langOpen ? C.surfaceAlt : "transparent", color: C.textMid, border: `1px solid ${langOpen ? C.border : "transparent"}` }}
            >
              <span>{currentLang?.flag ?? "🌐"}</span>
              <span>{lang.toUpperCase()}</span>
              <ChevronDown size={12} style={{ transform: langOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
            </button>
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden shadow-xl"
                  style={{ background: C.surface, border: `1px solid ${C.border}`, minWidth: 130 }}
                >
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setLangOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-left transition-colors hover:bg-gray-50"
                      style={{ color: lang === l.code ? C.accent : C.textMid, fontWeight: lang === l.code ? 700 : 500 }}
                    >
                      <span>{l.flag}</span>
                      <span>{l.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link
            to="/booking"
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ background: C.accent, color: "#fff" }}
          >
            Записаться
          </Link>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg"
            style={{ color: C.text }}
            aria-label="Menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="md:hidden overflow-hidden"
            style={{ borderTop: `1px solid ${C.border}`, background: C.surface }}
          >
            <div className="px-5 py-4 flex flex-col gap-1">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  to={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="py-3 text-sm font-medium"
                  style={{ color: C.textMid, borderBottom: `1px solid ${C.borderLight}` }}
                >
                  {l.label}
                </Link>
              ))}
              <Link
                to="/booking"
                className="mt-3 flex items-center justify-center py-3 rounded-xl text-sm font-semibold"
                style={{ background: C.accent, color: "#fff" }}
              >
                Записаться
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ────────────────────────────────────────────────────────────────
// VIDEO HERO
// ────────────────────────────────────────────────────────────────
function V3VideoHero() {
  const mobileVideoRef = useRef<HTMLVideoElement>(null);
  const desktopVideoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  const toggleMute = () => {
    [mobileVideoRef, desktopVideoRef].forEach((ref) => {
      const v = ref.current;
      if (!v) return;
      v.muted = !v.muted;
    });
    setMuted((m) => !m);
  };

  return (
    <section className="relative flex flex-col" style={{ background: C.bg }}>

      {/* ═══ MOBILE ═══ */}
      <div className="lg:hidden flex flex-col" style={{ paddingTop: 64 }}>
        {/* Full-width video */}
        <div className="relative w-full overflow-hidden" style={{ height: "130vw", maxHeight: 400 }}>
          <video
            ref={mobileVideoRef}
            src="/bef_after_video.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
            style={{ objectPosition: "center top" }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
            style={{ background: `linear-gradient(to bottom, transparent, ${C.bg})` }}
          />
          {/* Mute toggle – top-left */}
          <button
            onClick={toggleMute}
            className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-all active:scale-90"
            style={{ background: "rgba(0,0,0,0.38)" }}
          >
            {muted ? <VolumeX size={16} color="#fff" /> : <Volume2 size={16} color="#fff" />}
          </button>
        </div>

        {/* Copy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="flex flex-col gap-5 px-5 pt-6 pb-10"
        >
          <span className="inline-flex items-center self-start gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: C.tag, color: C.tagText }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.gold }} />
            Эстетическая косметология
          </span>

          <h1 className="text-3xl font-bold leading-tight" style={{ color: C.text }}>
            Красота, которая говорит{" "}
            <span style={{ color: C.gold }}>сама за себя</span>
          </h1>

          <p className="text-base leading-relaxed" style={{ color: C.textMid }}>
            Медицинские протоколы с видимым результатом уже после первой процедуры.
          </p>

          <div className="flex gap-6 py-1">
            {[{ n: "200+", l: "процедур" }, { n: "98%", l: "довольных" }, { n: "5 лет", l: "практики" }].map((s) => (
              <div key={s.l}>
                <div className="text-xl font-bold" style={{ color: C.text }}>{s.n}</div>
                <div className="text-xs mt-0.5" style={{ color: C.textMuted }}>{s.l}</div>
              </div>
            ))}
          </div>



          <div className="flex flex-col gap-3 pt-1">
            <Link to="/booking" className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
              style={{ background: C.accent, color: "#fff" }}>
              Записаться на приём <ArrowRight size={16} />
            </Link>
            <Link to="/services" className="flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold"
              style={{ border: `1.5px solid ${C.border}`, color: C.text }}>
              Все услуги
            </Link>
          </div>
        </motion.div>
      </div>

      {/* ═══ DESKTOP ═══ */}
      <div
        className="hidden lg:grid lg:grid-cols-2 w-full max-w-[1280px] mx-auto px-16 gap-16 items-center"
        style={{ minHeight: "100vh", paddingTop: 80, paddingBottom: 64 }}
      >
        {/* Left: copy */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-7"
        >
          <span className="inline-flex items-center self-start gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide"
            style={{ background: C.tag, color: C.tagText }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.gold }} />
            Эстетическая косметология
          </span>

          <h1 className="text-5xl xl:text-6xl font-bold leading-[1.12] tracking-tight" style={{ color: C.text }}>
            Красота,<br />
            которая говорит<br />
            <span style={{ color: C.gold }}>сама за себя</span>
          </h1>

          <p className="text-lg leading-relaxed max-w-md" style={{ color: C.textMid }}>
            Биоревитализация, мезотерапия и инъекционные методики —
            медицинские протоколы с видимым результатом уже после первой процедуры.
          </p>

          <div className="flex gap-8 pt-2">
            {[{ n: "200+", l: "процедур" }, { n: "98%", l: "довольных" }, { n: "5 лет", l: "практики" }].map((s) => (
              <div key={s.l}>
                <div className="text-2xl font-bold" style={{ color: C.text }}>{s.n}</div>
                <div className="text-xs mt-0.5" style={{ color: C.textMuted }}>{s.l}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <Link to="/booking"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{ background: C.accent, color: "#fff", boxShadow: "0 12px 32px rgba(28,43,58,0.22)" }}>
              Записаться на приём <ArrowRight size={16} />
            </Link>
            <Link to="/services"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-semibold transition-all hover:bg-gray-50 active:scale-95"
              style={{ color: C.text, border: `1.5px solid ${C.border}` }}>
              Все услуги
            </Link>
          </div>
        </motion.div>

        {/* Right: video card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div
            className="relative overflow-hidden rounded-3xl shadow-2xl"
            style={{ aspectRatio: "9/14", border: `1px solid ${C.border}` }}
          >
            <video
              ref={desktopVideoRef}
              src="/bef_after_video.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
              style={{ objectPosition: "center top" }}
            />
            {/* Mute toggle – top-left */}
            <button
              onClick={toggleMute}
              className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110"
              style={{ background: "rgba(255,255,255,0.22)" }}
            >
              {muted ? <VolumeX size={14} color="#fff" /> : <Volume2 size={14} color="#fff" />}
            </button>
          </div>

          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -bottom-4 -left-4 rounded-2xl px-4 py-3 shadow-xl"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}
          >
            <div className="text-xs font-semibold" style={{ color: C.textMuted }}>Результат</div>
            <div className="text-sm font-bold mt-0.5" style={{ color: C.text }}>уже после 1 сеанса</div>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll hint desktop */}
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="hidden lg:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-1.5"
        style={{ color: C.textMuted }}
      >
        <span className="text-[10px] font-medium uppercase tracking-widest">Прокрутить</span>
        <ChevronDown size={16} />
      </motion.div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────
// TRUST STRIP
// ────────────────────────────────────────────────────────────────
function V3Trust() {
  const items = [
    { icon: "🏥", label: "Медицинская лицензия" },
    { icon: "🎓", label: "Высшее образование" },
    { icon: "💉", label: "Сертифицированные препараты" },
    { icon: "🛡️", label: "Безопасные протоколы" },
  ];

  return (
    <div
      className="w-full overflow-x-auto"
      style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: C.surface }}
    >
      <div className="flex min-w-max md:min-w-0 md:grid md:grid-cols-4 divide-x" style={{ borderColor: C.border }}>
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-8 py-4 flex-shrink-0">
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs font-semibold whitespace-nowrap" style={{ color: C.textMid }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// ABOUT
// ────────────────────────────────────────────────────────────────
interface AboutData {
  name: string;
  title: string;
  regNumber: string;
  text: string;
  text2: string;
  imageUrl: string;
}

const aboutDefaults: AboutData = {
  name: "Анастасия Букина",
  title: "Врач-косметолог",
  regNumber: "59850068090",
  text: "Я — Анастасия Букина, косметолог с высшим медицинским образованием Латвийского Университета по специальности медицинская сестра.",
  text2: "В моей практике косметология — это не просто процедуры, а глубокий медицинский анализ. Истинный результат достижим лишь когда мы смотрим на проблему комплексно, учитывая внутренние и внешние факторы.",
  imageUrl: "https://storage.googleapis.com/aida-uploads/default/20260408-073123.jpeg",
};

function V3About() {
  const [data, setData] = useState<AboutData>(aboutDefaults);

  useEffect(() => {
    getDoc(doc(db, "content", "about"))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setData({
            name: d.name || aboutDefaults.name,
            title: d.title || aboutDefaults.title,
            regNumber: d.regNumber || aboutDefaults.regNumber,
            text: d.text || aboutDefaults.text,
            text2: d.text2 || aboutDefaults.text2,
            imageUrl: d.imageUrl || aboutDefaults.imageUrl,
          });
        }
      })
      .catch(console.error);
  }, []);

  return (
    <section id="about" className="py-20 lg:py-28" style={{ background: C.bg }}>
      <div className="max-w-[1280px] mx-auto px-5 sm:px-10 lg:px-16">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">

          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative order-2 lg:order-1"
          >
            <div className="overflow-hidden rounded-3xl shadow-lg" style={{ aspectRatio: "4/5", border: `1px solid ${C.border}` }}>
              <img src={data.imageUrl} alt={data.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div
              className="absolute bottom-6 right-6 rounded-2xl px-4 py-3 shadow-xl"
              style={{ background: C.surface, border: `1px solid ${C.border}` }}
            >
              <div className="text-xs" style={{ color: C.textMuted }}>Рег. номер</div>
              <div className="text-sm font-bold mt-0.5" style={{ color: C.text }}>{data.regNumber}</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex flex-col gap-6 order-1 lg:order-2"
          >
            <span className="inline-block self-start px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: C.tag, color: C.tagText }}>{data.title}</span>

            <h2 className="text-3xl lg:text-5xl font-bold leading-tight" style={{ color: C.text }}>{data.name}</h2>

            <div className="space-y-4 text-base leading-relaxed" style={{ color: C.textMid }}>
              <p>{data.text}</p>
              <p>{data.text2}</p>
            </div>

            <div className="h-px" style={{ background: C.border }} />

            <Link to="/about" className="inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-60"
              style={{ color: C.accent }}>
              Подробнее об Анастасии <ArrowRight size={15} />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────
// SERVICES
// ────────────────────────────────────────────────────────────────
function V3Services() {

  return (
    <section id="services" className="py-20 lg:py-28" style={{ background: C.surface }}>
      <div className="max-w-[1280px] mx-auto px-5 sm:px-10 lg:px-16">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-14"
        >
          <div>
            <span className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
              style={{ background: C.tag, color: C.tagText }}>
              Наши услуги
            </span>
            <h2 className="text-3xl lg:text-5xl font-bold leading-tight" style={{ color: C.text }}>
              Эстетическая косметология
            </h2>
          </div>
          <Link to="/services" className="inline-flex items-center gap-2 text-sm font-semibold flex-shrink-0 pb-1 transition-opacity hover:opacity-60"
            style={{ color: C.accent }}>
            Все услуги <ArrowRight size={15} />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {servicesData.slice(0, 8).map((service, i) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.5 }}
                className="group"
              >
                <Link
                  to={`/service/${service.id}`}
                  className="flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-lg"
                  style={{ background: C.surface, border: `1px solid ${C.border}` }}
                >
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.32), transparent)" }} />
                    <div className="absolute bottom-3 left-3 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: C.gold }}>
                      <Icon size={16} color="#fff" />
                    </div>
                  </div>
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <h3 className="text-base font-semibold leading-snug" style={{ color: C.text }}>{service.title}</h3>
                    <p className="text-xs leading-relaxed line-clamp-2 flex-1" style={{ color: C.textMuted }}>{service.description}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold mt-1 transition-opacity group-hover:opacity-60"
                      style={{ color: C.accent }}>
                      Узнать больше <ArrowRight size={12} />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────
// FAQ
// ────────────────────────────────────────────────────────────────
function V3FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  const faqs = [
    { q: "Как подготовиться к первой процедуре?", a: "Достаточно просто прийти в хорошем настроении." },
    { q: "Когда будет виден первый результат?", a: "Чаще всего эффект заметен сразу после процедуры." },
    { q: "Как часто нужно посещать косметолога?", a: "Для поддержания результата мы рекомендуем 1 раз в месяц." }
  ];

  return (
    <section id="faq" className="py-20 lg:py-28" style={{ background: C.bg }}>
      <div className="max-w-[760px] mx-auto px-5 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
            style={{ background: C.tag, color: C.tagText }}>FAQ</span>
          <h2 className="text-3xl lg:text-4xl font-bold" style={{ color: C.text }}>
            Часто задаваемые вопросы
          </h2>
        </motion.div>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="overflow-hidden rounded-2xl"
              style={{ border: `1px solid ${C.border}`, background: C.surface }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold pr-4" style={{ color: C.text }}>{faq.q}</span>
                <motion.span
                  animate={{ rotate: open === i ? 180 : 0 }}
                  transition={{ duration: 0.22 }}
                  style={{ color: C.textMuted, flexShrink: 0 }}
                >
                  <ChevronDown size={18} />
                </motion.span>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="px-5 pb-5 text-sm leading-relaxed"
                      style={{ color: C.textMid, borderTop: `1px solid ${C.borderLight}`, paddingTop: "1rem" }}>
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────
// CTA
// ────────────────────────────────────────────────────────────────
function V3CTA() {
  return (
    <section className="py-16 lg:py-24 px-5 sm:px-10 lg:px-16" style={{ background: C.surface }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-[1280px] mx-auto relative overflow-hidden rounded-3xl"
        style={{ background: C.accent }}
      >
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-10 pointer-events-none" style={{ background: C.gold }} />

        <div className="relative px-8 py-14 sm:p-16 flex flex-col sm:flex-row items-center justify-between gap-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: C.goldLight }}>
              Первая консультация
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold leading-tight text-white">
              Готовы преобразить свою кожу?
            </h2>
            <p className="mt-3 text-base leading-relaxed max-w-md" style={{ color: "rgba(255,255,255,0.65)" }}>
              Запишитесь на первичную консультацию сегодня и получите индивидуальный план ухода в подарок.
            </p>
          </div>
          <Link
            to="/booking"
            className="flex-shrink-0 inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-bold shadow-xl transition-all hover:scale-105 active:scale-95"
            style={{ background: "#fff", color: C.accent }}
          >
            Записаться сейчас
            <ArrowRight size={16} />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────
// FOOTER
// ────────────────────────────────────────────────────────────────
function V3Footer() {
  return (
    <footer style={{ background: C.text }}>
      <div className="max-w-[1280px] mx-auto px-5 sm:px-10 lg:px-16 py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.gold }}>
                <PlusSquare size={16} color="#fff" />
              </div>
              <span className="text-base font-bold text-white">SKINLAB</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
              Профессиональная эстетическая косметология в Риге — LabSkin.
              Анастасия Букина (ID: 59850068090)
            </p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: C.gold }}>Контакты</p>
            <div className="space-y-2">
              {[{ Icon: MapPin, text: "Рига, Латвия" }, { Icon: Phone, text: "+371 00 000 000" }, { Icon: Mail, text: "hello@estheticlab.ru" }].map(
                ({ Icon, text }) => (
                  <div key={text} className="flex items-center gap-2">
                    <Icon size={13} style={{ color: "rgba(255,255,255,0.4)", flexShrink: 0 }} />
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>{text}</span>
                  </div>
                )
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: C.gold }}>График работы</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>По предварительной записи</p>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: C.gold }}>Юридическая информация</p>
            <div className="space-y-2">
              {[
                { label: "Правовая информация", to: "/legal-notice" },
                { label: "Политика конфиденциальности", to: "/privacy-policy" },
                { label: "Условия использования", to: "/terms-of-service" },
                { label: "Политика Cookie", to: "/cookie-policy" },
              ].map((l) => (
                <Link key={l.to} to={l.to} className="block text-xs transition-opacity hover:opacity-100"
                  style={{ color: "rgba(255,255,255,0.45)" }}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div
          className="mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}
        >
          <span>© 2024 SKINLAB. Все права защищены.</span>
          <span>Имеются противопоказания, необходима консультация специалиста.</span>
        </div>
      </div>
    </footer>
  );
}

// ────────────────────────────────────────────────────────────────
// PAGE ROOT
// ────────────────────────────────────────────────────────────────
export default function HomeV3() {
  return (
    <div className="font-sans antialiased" style={{ background: C.bg }}>
      <V3Header />
      <main>
        <V3VideoHero />
        <V3Trust />
        <V3About />
        <V3Services />
        <V3FAQ />
        <V3CTA />
      </main>
      <V3Footer />
    </div>
  );
}
