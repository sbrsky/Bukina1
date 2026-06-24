import React, { useRef, useState, useEffect } from "react";
import { motion } from "motion/react";

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  className?: string;
  aspectRatio?: string;
}

export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  className = "",
  aspectRatio = "3/4",
}: BeforeAfterSliderProps) {
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
      className={`relative w-full select-none overflow-hidden touch-none rounded-3xl ${className}`}
      style={{
        aspectRatio,
        cursor: dragging ? "grabbing" : "grab",
        boxShadow: "0 12px 40px rgba(0,0,0,0.06)",
        border: "1px solid rgba(0,0,0,0.05)",
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
        src={beforeImage}
        alt="До"
        className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
        draggable={false}
      />

      {/* AFTER photo – clipped by slider */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPct}% 0 0)` }}
      >
        <img
          src={afterImage}
          alt="После"
          className="w-full h-full object-cover object-center"
          draggable={false}
        />
        {/* Soft edge on after side */}
        <div
          className="absolute inset-y-0 right-0 w-16 pointer-events-none"
          style={{ background: `linear-gradient(to right, transparent, rgba(255,255,255,0.4))` }}
        />
      </div>

      {/* divider line */}
      <div
        className="absolute top-0 bottom-0 w-[2.5px] pointer-events-none"
        style={{
          left: `calc(${sliderPct}% - 1px)`,
          background: `linear-gradient(to bottom, transparent, #fff, #fff, transparent)`,
          boxShadow: "0 0 10px rgba(0,0,0,0.3)",
          opacity: 0.95,
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
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md bg-white border border-slate-200"
        >
          <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
            <path d="M6 7H0M0 7L4 3M0 7L4 11" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 7H22M22 7L18 3M22 7L18 11" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </motion.div>

      {/* BEFORE label */}
      <div
        className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md pointer-events-none"
        style={{
          background: "rgba(255,255,255,0.8)",
          color: "#000",
          opacity: sliderPct > 15 ? 1 : 0,
          transition: "opacity 0.2s",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        До
      </div>

      {/* AFTER label */}
      <div
        className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md pointer-events-none"
        style={{
          background: "rgba(255,255,255,0.8)",
          color: "#000",
          opacity: sliderPct < 85 ? 1 : 0,
          transition: "opacity 0.2s",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        После
      </div>
    </div>
  );
}
