import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { servicesData } from "../data/servicesData";
import {
  ChevronDown,
  Menu,
  X,
  PlusSquare,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
} from "lucide-react";
import { useLang } from "../context/LangContext";

// ── Time-based theme logic ─────────────────────────────────────────────────────
function getTimeTheme() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12)
    return "morning"; // 6–12: soft warm light
  if (hour >= 12 && hour < 17)
    return "day"; // 12–17: fresh bright
  if (hour >= 17 && hour < 21)
    return "evening"; // 17–21: golden warm
  return "night"; // 21–6: deep calm dark
}

type Theme = "morning" | "day" | "evening" | "night";

const THEMES: Record<
  Theme,
  {
    bg: string;
    bg2: string;
    text: string;
    textMuted: string;
    textBold: string;
    glass: string;
    glassBorder: string;
    aurora1: string;
    aurora2: string;
    aurora3: string;
    card: string;
    cardBorder: string;
    navBg: string;
    navText: string;
    faqBg: string;
    footerBg: string;
    accent: string;
    accentText: string;
  }
> = {
  morning: {
    bg: "from-rose-50 via-amber-50 to-orange-50",
    bg2: "from-rose-100/30 to-amber-100/30",
    text: "#7c5045",
    textMuted: "#a8897e",
    textBold: "#3d1f17",
    glass: "rgba(255,245,240,0.65)",
    glassBorder: "rgba(220,180,160,0.35)",
    aurora1:
      "radial-gradient(ellipse at 20% 30%, rgba(251,191,150,0.45) 0%, transparent 60%)",
    aurora2:
      "radial-gradient(ellipse at 80% 10%, rgba(253,215,195,0.38) 0%, transparent 55%)",
    aurora3:
      "radial-gradient(ellipse at 50% 80%, rgba(253,230,210,0.3) 0%, transparent 50%)",
    card: "rgba(255,248,244,0.72)",
    cardBorder: "rgba(220,185,165,0.28)",
    navBg: "rgba(255,248,244,0.82)",
    navText: "#7c5045",
    faqBg: "rgba(253,240,232,0.6)",
    footerBg: "rgba(255,245,240,0.85)",
    accent: "#c96a4a",
    accentText: "#fff",
  },
  day: {
    bg: "from-sky-50 via-emerald-50 to-teal-50",
    bg2: "from-sky-100/30 to-emerald-100/30",
    text: "#2d5551",
    textMuted: "#5d8884",
    textBold: "#0d2e2b",
    glass: "rgba(235,252,248,0.65)",
    glassBorder: "rgba(130,210,195,0.32)",
    aurora1:
      "radial-gradient(ellipse at 15% 25%, rgba(134,230,205,0.35) 0%, transparent 60%)",
    aurora2:
      "radial-gradient(ellipse at 85% 15%, rgba(147,220,250,0.3) 0%, transparent 55%)",
    aurora3:
      "radial-gradient(ellipse at 50% 85%, rgba(173,240,210,0.28) 0%, transparent 50%)",
    card: "rgba(238,253,248,0.70)",
    cardBorder: "rgba(120,200,185,0.25)",
    navBg: "rgba(238,253,248,0.85)",
    navText: "#2d5551",
    faqBg: "rgba(225,248,242,0.6)",
    footerBg: "rgba(235,252,248,0.88)",
    accent: "#1e7a6e",
    accentText: "#fff",
  },
  evening: {
    bg: "from-amber-50 via-orange-50 to-rose-50",
    bg2: "from-amber-100/30 to-rose-100/30",
    text: "#6b3e26",
    textMuted: "#9a6845",
    textBold: "#2d1508",
    glass: "rgba(255,245,235,0.68)",
    glassBorder: "rgba(215,165,115,0.32)",
    aurora1:
      "radial-gradient(ellipse at 10% 30%, rgba(255,180,100,0.4) 0%, transparent 60%)",
    aurora2:
      "radial-gradient(ellipse at 80% 15%, rgba(255,145,90,0.35) 0%, transparent 55%)",
    aurora3:
      "radial-gradient(ellipse at 55% 80%, rgba(255,200,140,0.28) 0%, transparent 50%)",
    card: "rgba(255,248,236,0.73)",
    cardBorder: "rgba(215,165,115,0.28)",
    navBg: "rgba(255,248,236,0.84)",
    navText: "#6b3e26",
    faqBg: "rgba(255,242,225,0.6)",
    footerBg: "rgba(255,245,232,0.88)",
    accent: "#c05a1c",
    accentText: "#fff",
  },
  night: {
    bg: "from-slate-900 via-indigo-950 to-purple-950",
    bg2: "from-slate-800/40 to-indigo-900/40",
    text: "#c8bfe8",
    textMuted: "#8d85b5",
    textBold: "#f0ecff",
    glass: "rgba(30,25,55,0.62)",
    glassBorder: "rgba(120,100,200,0.28)",
    aurora1:
      "radial-gradient(ellipse at 20% 25%, rgba(88,60,180,0.42) 0%, transparent 60%)",
    aurora2:
      "radial-gradient(ellipse at 80% 15%, rgba(60,80,200,0.35) 0%, transparent 55%)",
    aurora3:
      "radial-gradient(ellipse at 50% 80%, rgba(120,50,180,0.3) 0%, transparent 50%)",
    card: "rgba(30,25,55,0.65)",
    cardBorder: "rgba(110,90,190,0.28)",
    navBg: "rgba(20,16,40,0.88)",
    navText: "#c8bfe8",
    faqBg: "rgba(25,20,50,0.62)",
    footerBg: "rgba(18,14,38,0.90)",
    accent: "#7c5cfa",
    accentText: "#fff",
  },
};

// ── Glass card component ──────────────────────────────────────────────────────
function GlassCard({
  children,
  className = "",
  theme,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  theme: (typeof THEMES)[Theme];
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative rounded-3xl overflow-hidden backdrop-blur-xl ${className}`}
      style={{
        background: theme.glass,
        border: `1px solid ${theme.glassBorder}`,
        boxShadow: `0 8px 32px ${theme.glassBorder}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Breathing button ──────────────────────────────────────────────────────────
function BreathButton({
  children,
  to,
  theme,
  secondary = false,
}: {
  children: React.ReactNode;
  to: string;
  theme: (typeof THEMES)[Theme];
  secondary?: boolean;
}) {
  return (
    <motion.div
      animate={{ scale: [1, 1.025, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <Link
        to={to}
        className="inline-flex items-center gap-3 px-8 py-4 font-bold rounded-2xl transition-all duration-300 group"
        style={
          secondary
            ? {
                background: "transparent",
                border: `1.5px solid ${theme.accent}`,
                color: theme.accent,
              }
            : {
                background: theme.accent,
                color: theme.accentText,
                boxShadow: `0 8px 32px ${theme.accent}55`,
              }
        }
      >
        {children}
        <ArrowRight
          size={18}
          className="transform group-hover:translate-x-1 transition-transform"
        />
      </Link>
    </motion.div>
  );
}

// ── BEFORE/AFTER SLIDER ───────────────────────────────────────────────────────
function BeforeAfterSlider({ theme }: { theme: (typeof THEMES)[Theme] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPct, setSliderPct] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [hinted, setHinted] = useState(false);

  // ── pointer helpers ──
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  const setPctFromEvent = (clientX: number) => {
    if (!containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    setSliderPct(clamp(((clientX - left) / width) * 100, 2, 98));
  };

  // mouse
  const onMouseDown = (e: React.MouseEvent) => { setDragging(true); setPctFromEvent(e.clientX); };
  const onMouseMove = (e: React.MouseEvent) => { if (dragging) setPctFromEvent(e.clientX); };
  const onMouseUp   = () => setDragging(false);

  // touch
  const onTouchStart = (e: React.TouchEvent) => { setDragging(true); setPctFromEvent(e.touches[0].clientX); };
  const onTouchMove  = (e: React.TouchEvent) => { if (dragging) { e.preventDefault(); setPctFromEvent(e.touches[0].clientX); } };
  const onTouchEnd   = () => setDragging(false);

  // entrance hint animation
  useEffect(() => {
    const t = setTimeout(() => setHinted(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none overflow-hidden touch-none"
      style={{
        aspectRatio: "3/4",
        maxHeight: "min(72vh, 600px)",
        borderRadius: 28,
        cursor: dragging ? "grabbing" : "grab",
        border: `1.5px solid ${theme.glassBorder}`,
        boxShadow: `0 24px 60px ${theme.accent}30`,
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* BEFORE photo – full width */}
      <img
        src="/before.jpeg"
        alt="До процедуры"
        className="absolute inset-0 w-full h-full object-cover object-top pointer-events-none"
        draggable={false}
      />

      {/* AFTER photo – clipped by slider */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPct}% 0 0)` }}
      >
        <img
          src="/after.jpeg"
          alt="После процедуры"
          className="w-full h-full object-cover object-top"
          draggable={false}
        />
        {/* soft vignette edge on after side */}
        <div
          className="absolute inset-y-0 right-0 w-16 pointer-events-none"
          style={{ background: `linear-gradient(to right, transparent, ${theme.glass}80)` }}
        />
      </div>

      {/* divider line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] pointer-events-none"
        style={{
          left: `${sliderPct}%`,
          background: `linear-gradient(to bottom, transparent, ${theme.accent}, ${theme.accent}, transparent)`,
          opacity: 0.9,
        }}
      />

      {/* handle */}
      <motion.div
        animate={hinted && !dragging ? { x: [0, -18, 18, 0] } : {}}
        transition={{ duration: 1.1, delay: 0.1, ease: "easeInOut" }}
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 flex items-center justify-center pointer-events-none"
        style={{ left: `${sliderPct}%` }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-lg"
          style={{
            background: theme.accent,
            border: `2.5px solid rgba(255,255,255,0.7)`,
          }}
        >
          <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
            <path d="M6 7H0M0 7L4 3M0 7L4 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 7H22M22 7L18 3M22 7L18 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </motion.div>

      {/* BEFORE label */}
      <div
        className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md pointer-events-none"
        style={{
          background: "rgba(0,0,0,0.45)",
          color: "#fff",
          opacity: sliderPct > 15 ? 1 : 0,
          transition: "opacity 0.2s",
        }}
      >
        До
      </div>

      {/* AFTER label */}
      <div
        className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md pointer-events-none"
        style={{
          background: `${theme.accent}cc`,
          color: "#fff",
          opacity: sliderPct < 85 ? 1 : 0,
          transition: "opacity 0.2s",
        }}
      >
        После
      </div>

      {/* swipe hint text – fades after first drag */}
      {!dragging && sliderPct === 50 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: hinted ? 0.85 : 0 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-5 left-0 right-0 flex justify-center pointer-events-none"
        >
          <span
            className="px-4 py-2 rounded-full text-xs font-semibold backdrop-blur-md"
            style={{ background: "rgba(0,0,0,0.38)", color: "#fff" }}
          >
            ← Двигай для сравнения →
          </span>
        </motion.div>
      )}
    </div>
  );
}

// ── HERO SECTION ──────────────────────────────────────────────────────────────
function V2Hero({ theme }: { theme: (typeof THEMES)[Theme] }) {

  return (
    <section className="px-5 sm:px-12 lg:px-40 pt-6 pb-16">
      <div className="max-w-[1200px] mx-auto">

        {/* ── Mobile-first: slider on top, copy below ── */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-16">

          {/* Slider – takes full width on mobile, half on desktop */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="w-full lg:w-[52%] flex-shrink-0"
          >
            <BeforeAfterSlider theme={theme} />
          </motion.div>

          {/* Copy side */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="flex flex-col gap-6"
          >
            {/* label pill */}
            <span
              className="inline-block self-start px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest"
              style={{
                background: `${theme.accent}18`,
                color: theme.accent,
                border: `1px solid ${theme.accent}30`,
              }}
            >
              Результаты
            </span>

            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight"
              style={{ color: theme.textBold }}
            >
              Эстетическая косметология нового уровня
            </h1>

            <p className="text-base sm:text-lg leading-relaxed" style={{ color: theme.textMuted }}>
              Биоревитализация губ — мягкое восстановление объёма и увлажнения с помощью гиалуроновой кислоты.
              Результат виден сразу&nbsp;— кожа становится эластичной и сияющей.
            </p>

            {/* stats row */}
            <div className="flex gap-6 flex-wrap">
              {[
                { num: "200+", label: "процедур" },
                { num: "98%", label: "довольных" },
                { num: "5 лет", label: "опыта" },
              ].map((s) => (
                <div key={s.label} className="flex flex-col">
                  <span className="text-2xl font-bold" style={{ color: theme.accent }}>{s.num}</span>
                  <span className="text-xs" style={{ color: theme.textMuted }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-wrap gap-3 mt-2">
              <Link
                to="/booking"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
                style={{ background: theme.accent, color: "#fff", boxShadow: `0 8px 28px ${theme.accent}50` }}
              >
                Записаться
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "transparent",
                  border: `1.5px solid ${theme.accent}`,
                  color: theme.accent,
                }}
              >
                Все услуги
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── ABOUT SECTION ─────────────────────────────────────────────────────────────
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
  title: "Косметолог",
  regNumber: "59850068090",
  text: "Я — Анастасия Букина, косметолог с высшим медицинским образованием Латвийского Университета по специальности медицинская сестра.",
  text2: "В моей практике косметология — это не просто процедуры, а глубокий медицинский анализ. Я убеждена, что истинный результат достижим лишь тогда, когда мы смотрим на проблему комплексно.",
  imageUrl: "https://storage.googleapis.com/aida-uploads/default/20260408-073123.jpeg",
};

function V2About({ theme }: { theme: (typeof THEMES)[Theme] }) {
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
    <section
      id="about"
      className="px-6 sm:px-12 lg:px-40 py-20 overflow-hidden"
    >
      <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-14 items-center">
        {/* Text side */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="flex flex-col gap-7"
        >
          <div>
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-block px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-4"
              style={{
                background: `${theme.accent}18`,
                color: theme.accent,
                border: `1px solid ${theme.accent}30`,
              }}
            >
              {data.title}
            </motion.span>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-2 leading-tight"
              style={{ color: theme.textBold }}
            >
              {data.name}
            </h2>
            <p className="text-sm font-medium" style={{ color: theme.textMuted }}>
              Регистрационный номер: {data.regNumber}
            </p>
          </div>

          <GlassCard theme={theme} className="p-6">
            <div className="space-y-5 leading-relaxed text-base" style={{ color: theme.text }}>
              <p>{data.text}</p>
              <p>{data.text2}</p>
            </div>
          </GlassCard>

          <div>
            <BreathButton to="/about" theme={theme}>
              Подробнее
            </BreathButton>
          </div>
        </motion.div>

        {/* Image side */}
        <motion.div
          initial={{ opacity: 0, scale: 0.93 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative"
        >
          {/* Aurora halo behind image */}
          <div
            className="absolute -inset-6 rounded-[40px] blur-3xl opacity-40"
            style={{
              background: `radial-gradient(ellipse, ${theme.accent}50 0%, transparent 70%)`,
            }}
          />
          <div
            className="aspect-[4/5] rounded-[32px] overflow-hidden relative shadow-2xl"
            style={{ border: `1.5px solid ${theme.glassBorder}` }}
          >
            <img
              src={data.imageUrl}
              alt={data.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* glass gradient at bottom */}
            <div
              className="absolute inset-x-0 bottom-0 h-1/3"
              style={{
                background: `linear-gradient(to top, ${theme.glass}, transparent)`,
              }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ── SERVICES SECTION ──────────────────────────────────────────────────────────
function V2Services({ theme }: { theme: (typeof THEMES)[Theme] }) {

  return (
    <section id="services" className="py-24 px-6 sm:px-12 lg:px-40">
      <div className="max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span
            className="inline-block px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-5"
            style={{
              background: `${theme.accent}18`,
              color: theme.accent,
              border: `1px solid ${theme.accent}30`,
            }}
          >
            Наши услуги
          </span>
          <h2
            className="text-4xl lg:text-6xl font-bold tracking-tight mb-5"
            style={{ color: theme.textBold }}
          >
            Эстетическая косметология
          </h2>
          <p className="text-lg leading-relaxed max-w-2xl mx-auto" style={{ color: theme.textMuted }}>
            Мы предлагаем широкий спектр процедур для сохранения молодости и красоты вашей кожи, используя только проверенные и безопасные методики.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {servicesData.map((service, i) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="group cursor-pointer"
              >
                <GlassCard
                  theme={theme}
                  className="flex flex-col h-full transition-all duration-500 group-hover:shadow-2xl"
                >
                  {/* image */}
                  <div className="relative h-44 overflow-hidden rounded-t-3xl">
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-full object-cover scale-100 group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    {/* icon badge */}
                    <motion.div
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                      className="absolute bottom-3 left-4 w-11 h-11 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg"
                      style={{
                        background: `${theme.accent}dd`,
                        color: "#fff",
                      }}
                    >
                      <Icon size={20} />
                    </motion.div>
                  </div>

                  <div className="px-5 pb-5 pt-4 flex-1 flex flex-col">
                    <h3
                      className="text-lg font-bold mb-2 transition-colors break-words"
                      style={{ color: theme.textBold }}
                    >
                      {service.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed mb-5 flex-1 break-words"
                      style={{ color: theme.textMuted }}
                    >
                      {service.description}
                    </p>

                    <Link
                      to={`/service/${service.id}`}
                      className="mt-auto inline-flex items-center justify-between w-full group/btn"
                    >
                      <span
                        className="text-sm font-bold transition-colors"
                        style={{ color: theme.textBold }}
                      >
                        Узнать больше
                      </span>
                      <motion.div
                        whileHover={{ x: 4 }}
                        className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                        style={{
                          background: `${theme.accent}22`,
                          color: theme.accent,
                          border: `1px solid ${theme.accent}35`,
                        }}
                      >
                        <ArrowRight size={16} />
                      </motion.div>
                    </Link>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-14 text-center"
        >
          <BreathButton to="/services" theme={theme}>
            Все услуги
          </BreathButton>
        </motion.div>
      </div>
    </section>
  );
}

// ── FAQ SECTION ───────────────────────────────────────────────────────────────
function V2FAQ({ theme }: { theme: (typeof THEMES)[Theme] }) {
  const [open, setOpen] = useState<number | null>(0);

  const faqs = [
    { q: "Как подготовиться к первой процедуре?", a: "Достаточно просто прийти в хорошем настроении." },
    { q: "Когда будет виден первый результат?", a: "Чаще всего эффект заметен сразу после процедуры." },
    { q: "Как часто нужно посещать косметолога?", a: "Для поддержания результата мы рекомендуем 1 раз в месяц." }
  ];

  return (
    <section id="faq" className="px-6 sm:px-12 lg:px-40 py-20">
      <div className="max-w-[760px] mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl font-bold tracking-tight mb-10 text-center"
          style={{ color: theme.textBold }}
        >
          Часто задаваемые вопросы
        </motion.h2>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <GlassCard theme={theme} className="overflow-hidden">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left cursor-pointer"
                >
                  <span className="text-base font-bold pr-4" style={{ color: theme.textBold }}>
                    {faq.q}
                  </span>
                  <motion.div
                    animate={{ rotate: open === i ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ color: theme.accent }}
                  >
                    <ChevronDown size={20} />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                      <div
                        className="px-5 pb-5 text-sm leading-relaxed whitespace-pre-line"
                        style={{
                          color: theme.text,
                          borderTop: `1px solid ${theme.glassBorder}`,
                          paddingTop: "1rem",
                        }}
                      >
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA SECTION ───────────────────────────────────────────────────────────────
function V2CTA({ theme }: { theme: (typeof THEMES)[Theme] }) {

  return (
    <section className="px-6 sm:px-12 lg:px-40 py-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="max-w-[1200px] mx-auto relative overflow-hidden"
        style={{
          borderRadius: 36,
          background: theme.accent,
          boxShadow: `0 24px 80px ${theme.accent}55`,
        }}
      >
        {/* aurora blobs */}
        <div
          className="absolute top-0 right-0 -mr-24 -mt-24 w-80 h-80 rounded-full blur-3xl opacity-30"
          style={{ background: "#ffffff" }}
        />
        <div
          className="absolute bottom-0 left-0 -ml-24 -mb-24 w-80 h-80 rounded-full blur-3xl opacity-20"
          style={{ background: "#000000" }}
        />

        <div className="relative z-10 flex flex-col items-center gap-6 p-10 sm:p-16 text-center">
          <motion.h2
            animate={{ scale: [1, 1.015, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="text-4xl font-bold tracking-tight"
            style={{ color: "#fff" }}
          >
            Готовы преобразить свою кожу?
          </motion.h2>
          <p className="text-xl max-w-xl" style={{ color: "rgba(255,255,255,0.82)" }}>
            Запишитесь на первичную консультацию сегодня и получите индивидуальный план ухода в подарок.
          </p>
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Link
              to="/booking"
              className="mt-2 inline-flex items-center justify-center min-w-[220px] h-14 px-10 rounded-2xl text-lg font-bold shadow-2xl transition-all hover:scale-105"
              style={{
                background: "#fff",
                color: theme.accent,
              }}
            >
              Записаться сейчас
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

// ── HEADER V2 ─────────────────────────────────────────────────────────────────
function V2Header({ theme }: { theme: (typeof THEMES)[Theme] }) {
  const { lang, setLang, languages } = useLang();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langDropRef = useRef<HTMLDivElement>(null);
  const currentLang = languages.find((l) => l.code === lang) || languages[0];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langDropRef.current && !langDropRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 w-full px-6 sm:px-12 lg:px-40 py-4 transition-all duration-500"
      style={{
        background: scrolled ? theme.navBg : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? `1px solid ${theme.glassBorder}` : "none",
      }}
    >
      <div className="flex items-center justify-between max-w-[1200px] mx-auto">
        {/* Logo */}
        <Link to="/v2" className="flex items-center gap-3 group">
          <motion.div
            animate={{ scale: [1, 1.07, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${theme.accent}22`, color: theme.accent }}
          >
            <PlusSquare size={22} />
          </motion.div>
          <span className="text-xl font-bold tracking-tight" style={{ color: theme.textBold }}>
            SKINLAB
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "Главная", href: "/v2" },
            { label: "Услуги", href: "/services" },
            { label: "Обучение", href: "/training" },
          ].map((l) => (
            <Link
              key={l.label}
              to={l.href}
              className="text-sm font-bold transition-colors hover:opacity-70"
              style={{ color: theme.navText }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Language compact */}
          <div className="relative" ref={langDropRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold transition-all"
              style={{
                background: theme.glass,
                border: `1px solid ${theme.glassBorder}`,
                color: theme.navText,
              }}
            >
              <span>{currentLang.flag}</span>
              <span className="hidden sm:inline uppercase">{currentLang.code}</span>
              <ChevronDown
                size={12}
                className={`transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`}
                style={{ color: theme.accent }}
              />
            </button>
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 p-2 rounded-2xl shadow-2xl backdrop-blur-xl z-50 min-w-[160px]"
                  style={{
                    background: theme.navBg,
                    border: `1px solid ${theme.glassBorder}`,
                  }}
                >
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setLangOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all"
                      style={
                        lang === l.code
                          ? { background: `${theme.accent}18`, color: theme.accent, fontWeight: 700 }
                          : { color: theme.text }
                      }
                    >
                      <span>{l.flag}</span>
                      <span className="flex-1 text-left">{l.label}</span>
                      {lang === l.code && <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.accent }} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="hidden sm:block"
          >
            <Link
              to="/booking"
              className="inline-flex items-center justify-center rounded-full h-11 px-7 text-sm font-bold shadow-lg transition-all hover:scale-105"
              style={{
                background: theme.accent,
                color: theme.accentText,
                boxShadow: `0 4px 20px ${theme.accent}44`,
              }}
            >
              Записаться
            </Link>
          </motion.div>

          <button
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl transition-all"
            style={{ background: theme.glass, color: theme.textBold }}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="md:hidden absolute top-full left-0 w-full p-8 flex flex-col gap-6 shadow-2xl"
            style={{
              background: theme.navBg,
              backdropFilter: "blur(20px)",
              borderBottom: `1px solid ${theme.glassBorder}`,
            }}
          >
            {[
              { label: "Главная", href: "/v2" },
              { label: "Услуги", href: "/services" },
              { label: "Обучение", href: "/training" },
            ].map((l) => (
              <Link
                key={l.label}
                to={l.href}
                onClick={() => setIsMenuOpen(false)}
                className="text-lg font-bold"
                style={{ color: theme.navText }}
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/booking"
              onClick={() => setIsMenuOpen(false)}
              className="w-full h-14 rounded-2xl flex items-center justify-center text-base font-bold"
              style={{ background: theme.accent, color: theme.accentText }}
            >
              Записаться онлайн
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ── FOOTER V2 ─────────────────────────────────────────────────────────────────
function V2Footer({ theme }: { theme: (typeof THEMES)[Theme] }) {

  return (
    <footer
      className="px-6 sm:px-12 lg:px-40 py-16"
      style={{
        background: theme.footerBg,
        borderTop: `1px solid ${theme.glassBorder}`,
      }}
    >
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3" style={{ color: theme.accent }}>
            <PlusSquare size={26} />
            <h2 className="text-lg font-bold" style={{ color: theme.textBold }}>
              SKINLAB
            </h2>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: theme.textMuted }}>
            Профессиональная эстетическая косметология и уход за кожей лица.
            <br />
            Анастасия Букина
            <br />
            (ID: 59850068090)
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <h3 className="text-lg font-bold" style={{ color: theme.textBold }}>
            Контакты
          </h3>
          <div className="space-y-3">
            {[
              { Icon: MapPin, text: "Рига, Латвия" },
              { Icon: Phone, text: "+371 00 000 000" },
              { Icon: Mail, text: "hello@estheticlab.ru" },
            ].map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3" style={{ color: theme.text }}>
                <Icon size={18} style={{ color: theme.accent }} className="shrink-0" />
                <span className="text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <h3 className="text-lg font-bold" style={{ color: theme.textBold }}>
            Режим работы
          </h3>
          <p className="text-sm" style={{ color: theme.text }}>
            Пн-Сб 9:00 - 21:00
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <h3 className="text-lg font-bold" style={{ color: theme.textBold }}>
            Инфо
          </h3>
          <div className="flex flex-col gap-2 text-sm">
            {[
              { to: "/legal-notice", label: "Правовая информация" },
              { to: "/privacy-policy", label: "Политика конф." },
              { to: "/terms-of-service", label: "Условия использования" },
              { to: "/cookie-policy", label: "Cookie" },
            ].map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="hover:opacity-70 transition-opacity"
                style={{ color: theme.textMuted }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

    <div
      className="max-w-[1200px] mx-auto mt-14 pt-8 text-center text-sm"
      style={{
        color: theme.textMuted,
        borderTop: `1px solid ${theme.glassBorder}`,
      }}
    >
      © {new Date().getFullYear()} SKINLAB. Все права защищены.
    </div>
  </footer>
  );
}

// ── AURORA BACKGROUND ─────────────────────────────────────────────────────────
function AuroraBackground({ theme }: { theme: (typeof THEMES)[Theme] }) {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      {/* base gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${theme.bg}`} />
      {/* aurora blobs — animated */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: theme.aurora1 }}
      />
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: [1, 0.6, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{ background: theme.aurora2 }}
      />
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        style={{ background: theme.aurora3 }}
      />
      {/* noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "256px",
        }}
      />
    </div>
  );
}

// ── TIME INDICATOR PILL ───────────────────────────────────────────────────────
const THEME_LABELS: Record<Theme, string> = {
  morning: "🌅 Утро",
  day: "☀️ День",
  evening: "🌇 Вечер",
  night: "🌙 Ночь",
};

function TimeThemePill({ themeKey, theme }: { themeKey: Theme; theme: (typeof THEMES)[Theme] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 rounded-full text-xs font-bold backdrop-blur-xl shadow-lg"
      style={{
        background: theme.glass,
        border: `1px solid ${theme.glassBorder}`,
        color: theme.accent,
      }}
    >
      {THEME_LABELS[themeKey]} · Тема адаптирована под время суток
    </motion.div>
  );
}

// ── ROOT COMPONENT ────────────────────────────────────────────────────────────
export default function HomeV2() {
  const [themeKey, setThemeKey] = useState<Theme>(getTimeTheme);
  const theme = THEMES[themeKey];

  // Re-check theme every minute
  useEffect(() => {
    const id = setInterval(() => setThemeKey(getTimeTheme()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen relative">
      <AuroraBackground theme={theme} />
      <V2Header theme={theme} />
      <main>
        <V2Hero theme={theme} />
        <V2About theme={theme} />
        <V2Services theme={theme} />
        <V2FAQ theme={theme} />
        <V2CTA theme={theme} />
      </main>
      <V2Footer theme={theme} />
      <TimeThemePill themeKey={themeKey} theme={theme} />
    </div>
  );
}
