/**
 * DuckAssistant.tsx — Pixel duck mascot for the SKINLAB admin panel.
 *
 * Features:
 *   • Canvas-rendered 16×16 pixel duck with rich animations
 *   • Mood system: idle | excited | thinking | talking | sleeping | happy
 *   • Particle system: ZZZ, stars, sparkles
 *   • Context-aware tips from useAdminContext
 *   • Toggle between tip bubble and full Gemini AI chat (DuckChat)
 *   • Subtle 8-bit "quack" via Web Audio API on click
 *   • Reacts to page context with smart, localised hints
 */
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageSquare, Lightbulb } from 'lucide-react';
import { useAdminContext } from '../../hooks/useAdminContext';
import DuckChat from './DuckChat';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Mood = 'idle' | 'excited' | 'thinking' | 'talking' | 'sleeping' | 'happy';
type Mode = 'tip' | 'chat';

// ─── Pixel Data ────────────────────────────────────────────────────────────────
// 0=transparent, 1=body(yellow), 2=beak(orange), 3=eye(black),
// 4=wing(dark yellow), 5=belly(light yellow), 6=foot(orange), 7=blush(pink), 8=zzz(white)

const DUCK_BODY: number[][] = [
  [0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,1,1,3,1,1,1,1,1,0,0,0,0],
  [0,0,2,2,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,2,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,1,1,4,4,1,5,5,1,1,0,0,0,0],
  [0,0,0,1,1,4,4,1,5,5,1,1,0,0,0,0],
  [0,0,0,1,1,4,4,1,5,5,5,1,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,6,6,0,6,6,0,0,0,0,0,0],
  [0,0,0,0,6,6,0,0,0,6,6,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// Eye row variants
const EYE_OPEN:   number[] = [0,0,0,0,1,1,3,1,1,1,1,1,0,0,0,0];
const EYE_CLOSED: number[] = [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0]; // blink
const EYE_HAPPY:  number[] = [0,0,0,0,1,1,3,3,1,1,1,1,0,0,0,0]; // wide happy
const EYE_TIRED:  number[] = [0,0,0,0,1,1,8,1,1,1,1,1,0,0,0,0]; // half-lidded (8=white)

// Beak row variants (row 4)
const BEAK_NORMAL: number[] = [0,0,2,2,1,1,1,1,1,1,1,1,0,0,0,0];
const BEAK_OPEN:   number[] = [0,0,2,0,1,1,1,1,1,1,1,1,0,0,0,0];

// Feet variants
const FEET_NEUTRAL: number[][] = [
  [0,0,0,0,0,6,6,0,6,6,0,0,0,0,0,0],
  [0,0,0,0,6,6,0,0,0,6,6,0,0,0,0,0],
];
const FEET_WALK_1: number[][] = [
  [0,0,0,0,0,6,6,0,0,6,0,0,0,0,0,0],
  [0,0,0,0,0,6,6,0,0,6,6,0,0,0,0,0],
];
const FEET_WALK_2: number[][] = [
  [0,0,0,0,6,6,0,0,0,0,6,6,0,0,0,0],
  [0,0,0,6,6,0,0,0,0,0,0,6,6,0,0,0],
];

const COLORS: Record<number, string> = {
  1: '#FFD93D',
  2: '#FF8C00',
  3: '#1A1A2E',
  4: '#E6C235',
  5: '#FFF3B0',
  6: '#FF8C00',
  7: '#FFB3C6',
  8: '#FFFFFF',
};

// ─── Particle ──────────────────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  type: 'star' | 'zzz' | 'sparkle' | 'note';
  size: number;
  char?: string;
}

// ─── Sound ─────────────────────────────────────────────────────────────────────

function playQuack() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = 'square';
    o.frequency.setValueAtTime(440, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    o.start(ctx.currentTime);
    o.stop(ctx.currentTime + 0.2);
  } catch (_) { /* silent fail on strict contexts */ }
}

// ─── Pixel Duck Canvas ─────────────────────────────────────────────────────────

interface PixelDuckProps {
  size?: number;
  mood: Mood;
}

function PixelDuck({ size = 52, mood }: PixelDuckProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const blinkTimer = useRef(0);
  const isBlinking = useRef(false);
  const walkFrame = useRef(0);
  const prevMood = useRef<Mood>('idle');
  const moodTimer = useRef(0);

  const spawnParticle = useCallback((type: Particle['type'], canvasSize: number) => {
    const x = canvasSize * 0.6 + Math.random() * canvasSize * 0.5;
    const y = canvasSize * 0.05;
    particlesRef.current.push({
      x, y,
      vx: (Math.random() - 0.5) * 1.2,
      vy: -Math.random() * 1.0 - 0.3,
      life: 1,
      maxLife: 60 + Math.random() * 40,
      type,
      size: canvasSize / 9 + Math.random() * (canvasSize / 12),
      char: type === 'zzz' ? 'z' : type === 'note' ? '♪' : undefined,
    });
  }, []);

  const drawDuck = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, time: number) => {
      const px = w / 16;
      ctx.clearRect(0, 0, w, w);

      if (prevMood.current !== mood) {
        prevMood.current = mood;
        moodTimer.current = 0;
      }
      moodTimer.current++;

      // ---------- Bob / Jump offsets ----------
      let bobY = 0;
      let scaleX = 1;
      let scaleY = 1;

      if (mood === 'idle') {
        bobY = Math.sin(time * 0.003) * px * 0.5;
      } else if (mood === 'excited') {
        const t = moodTimer.current;
        bobY = -Math.abs(Math.sin(t * 0.25)) * px * 2.5;
        scaleX = 1 + Math.sin(t * 0.5) * 0.06;
        scaleY = 1 - Math.sin(t * 0.5) * 0.06;
      } else if (mood === 'thinking') {
        bobY = Math.sin(time * 0.002) * px * 0.3;
        // spawn question mark particles
        if (moodTimer.current % 50 === 0) spawnParticle('sparkle', w);
      } else if (mood === 'sleeping') {
        bobY = Math.sin(time * 0.0012) * px * 0.25;
        if (moodTimer.current % 80 === 0) spawnParticle('zzz', w);
      } else if (mood === 'happy') {
        bobY = -Math.abs(Math.sin(time * 0.006)) * px * 1.5;
        if (moodTimer.current % 25 === 0) spawnParticle('star', w);
        scaleX = 1 + Math.sin(time * 0.01) * 0.04;
      } else if (mood === 'talking') {
        bobY = Math.sin(time * 0.004) * px * 0.4;
      }

      // ---------- Blink logic ----------
      blinkTimer.current++;
      const blinkInterval = mood === 'sleeping' ? 40 : 180;
      if (blinkTimer.current > blinkInterval && !isBlinking.current) {
        isBlinking.current = true;
        blinkTimer.current = 0;
      }
      if (isBlinking.current && blinkTimer.current > (mood === 'sleeping' ? 20 : 8)) {
        isBlinking.current = false;
        blinkTimer.current = 0;
      }

      // ---------- Walk cycle ----------
      walkFrame.current = mood === 'excited' || mood === 'happy'
        ? Math.floor(time / 200) % 2
        : Math.floor(time / 400) % 2;

      // ---------- Apply transform ----------
      ctx.save();
      ctx.translate(w / 2, w / 2);
      ctx.scale(scaleX, scaleY);
      ctx.translate(-w / 2, -w / 2);

      // ---------- Draw pixels ----------
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          let pixel: number;

          if (y === 3) {
            // Eye row
            if (mood === 'sleeping' || (mood === 'idle' && isBlinking.current)) {
              pixel = EYE_CLOSED[x];
            } else if (mood === 'happy' || mood === 'excited') {
              pixel = EYE_HAPPY[x];
            } else {
              pixel = isBlinking.current ? EYE_CLOSED[x] : EYE_OPEN[x];
            }
          } else if (y === 4) {
            // Beak row
            pixel = mood === 'talking' && Math.floor(time / 200) % 2 === 0
              ? BEAK_OPEN[x]
              : BEAK_NORMAL[x];
          } else if (y === 13) {
            const feet = walkFrame.current === 0 ? FEET_NEUTRAL : FEET_WALK_1;
            pixel = feet[0][x];
          } else if (y === 14) {
            const feet = walkFrame.current === 0 ? FEET_NEUTRAL : FEET_WALK_2;
            pixel = feet[1][x];
          } else {
            pixel = DUCK_BODY[y][x];
          }

          if (pixel === 0) continue;
          const color = COLORS[pixel];
          if (!color) continue;

          // Blush in happy/excited
          if ((mood === 'happy' || mood === 'excited') && y === 3 && (x === 4 || x === 11)) {
            ctx.fillStyle = COLORS[7];
          } else {
            ctx.fillStyle = color;
          }

          const drawY = y < 13 ? y * px + bobY : y * px;
          ctx.fillRect(
            Math.round(x * px),
            Math.round(drawY),
            Math.ceil(px),
            Math.ceil(px)
          );
        }
      }

      ctx.restore();

      // ---------- Particles ----------
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 1;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;

        if (p.type === 'zzz' || p.type === 'note') {
          ctx.font = `bold ${Math.round(p.size)}px monospace`;
          ctx.fillStyle = p.type === 'zzz' ? '#94A3B8' : '#FCD34D';
          ctx.fillText(p.char ?? 'z', p.x, p.y);
        } else if (p.type === 'star') {
          ctx.fillStyle = '#FDE68A';
          const s = p.size * 0.5;
          // 4-point star
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - s);
          ctx.lineTo(p.x + s * 0.3, p.y - s * 0.3);
          ctx.lineTo(p.x + s, p.y);
          ctx.lineTo(p.x + s * 0.3, p.y + s * 0.3);
          ctx.lineTo(p.x, p.y + s);
          ctx.lineTo(p.x - s * 0.3, p.y + s * 0.3);
          ctx.lineTo(p.x - s, p.y);
          ctx.lineTo(p.x - s * 0.3, p.y - s * 0.3);
          ctx.closePath();
          ctx.fill();
        } else {
          // sparkle dot
          ctx.fillStyle = '#A5F3FC';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 1;
        return p.life > 0;
      });
    },
    [mood, spawnParticle]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    let animId: number;
    const loop = (time: number) => {
      drawDuck(ctx, size, time);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [size, drawDuck]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
    />
  );
}

// ─── Context-aware tips ────────────────────────────────────────────────────────

function useContextTips(context: ReturnType<typeof useAdminContext>): string[] {
  return useMemo(() => {
    const tips: string[] = [];
    const page = context.currentPage;

    if (context.pendingBookings > 0) {
      tips.push(`Кря! ${context.pendingBookings} ${
        context.pendingBookings === 1 ? 'заявка ждёт' : 'заявки ждут'
      } подтверждения!`);
    }
    if (page === 'Бронирования') {
      tips.push('Не забудь подтвердить или отклонить новые заявки.');
      tips.push('Кря! Клиент ждёт ответа — будь быстрее утки на воде!');
    }
    if (page === 'Управление слотами') {
      tips.push('Добавь слоты на следующую неделю заранее. Кря!');
      if (context.todaySlotsAvailable === 0)
        tips.push('⚠️ На сегодня нет свободных слотов!');
    }
    if (page === 'Редактор контента') {
      tips.push('Обновлённые фото до/после повышают конверсию. Кря!');
      tips.push('Проверь SEO-описания — это важно для поиска!');
    }
    if (page === 'Настройки') {
      tips.push('Настрой уведомления в Telegram — ни одна заявка не потеряется!');
    }
    if (page === 'Дашборд') {
      tips.push('Кря! Сегодня отличный день для эстетической косметологии!');
      if (context.todayBookings > 0)
        tips.push(`📋 ${context.todayBookings} записей на сегодня. Кря!`);
    }

    // Fallback static tips
    tips.push(
      'Я слежу за сервером. Пока всё работает стабильно. Кря!',
      'Нажми на меня, чтобы поговорить с AI-уточкой!',
      'Если кто-то отменил запись — не грусти, кряни и иди дальше!',
      'Добавь новые фото до/после — клиенты это любят. Кря!'
    );

    return tips;
  }, [context]);
}

// ─── Main Component ────────────────────────────────────────────────────────────

const INACTIVITY_SLEEP_MS = 5 * 60 * 1000; // 5 minutes → sleeping

export default function DuckAssistant() {
  const context = useAdminContext();
  const tips = useContextTips(context);

  const [mood, setMood] = useState<Mood>('idle');
  const [mode, setMode] = useState<Mode>('tip');
  const [isTipOpen, setIsTipOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [tipText, setTipText] = useState(tips[0]);

  const inactivityTimer = useRef<ReturnType<typeof setTimeout>>();
  const tipCycleTimer = useRef<ReturnType<typeof setInterval>>();

  // Reset inactivity
  const resetInactivity = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (mood === 'sleeping') setMood('idle');
    inactivityTimer.current = setTimeout(() => {
      if (!isChatOpen) setMood('sleeping');
    }, INACTIVITY_SLEEP_MS);
  }, [mood, isChatOpen]);

  useEffect(() => {
    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('keydown', resetInactivity);
    resetInactivity();
    return () => {
      window.removeEventListener('mousemove', resetInactivity);
      window.removeEventListener('keydown', resetInactivity);
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [resetInactivity]);

  // Auto-tip cycle
  useEffect(() => {
    const showTip = () => {
      if (isChatOpen) return;
      const nextTip = tips[Math.floor(Math.random() * tips.length)];
      setTipText(nextTip);
      setMood('talking');
      setIsTipOpen(true);
      setTimeout(() => {
        setIsTipOpen(false);
        setMood('idle');
      }, 8000); // stay for 8 seconds
    };

    // Initial tip after 3s
    const initTimer = setTimeout(showTip, 3000);

    tipCycleTimer.current = setInterval(showTip, 60000); // every 60 seconds

    return () => {
      clearTimeout(initTimer);
      clearInterval(tipCycleTimer.current);
    };
  }, [tips, isChatOpen]);

  // React to pending bookings
  useEffect(() => {
    if (context.pendingBookings > 0 && mood === 'idle') {
      setMood('excited');
      setTimeout(() => setMood('idle'), 3000);
    }
  }, [context.pendingBookings]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDuckClick = () => {
    playQuack();
    if (isChatOpen) {
      setIsChatOpen(false);
      setMood('idle');
    } else if (mode === 'chat') {
      setIsChatOpen(true);
      setIsTipOpen(false);
      setMood('happy');
    } else {
      const nextTip = tips[Math.floor(Math.random() * tips.length)];
      setTipText(nextTip);
      setMood('talking');
      setIsTipOpen(true);
      setTimeout(() => {
        setIsTipOpen(false);
        setMood('idle');
      }, 8000);
    }
  };

  const switchToChat = () => {
    setMode('chat');
    setIsTipOpen(false);
    setIsChatOpen(true);
    setMood('happy');
    playQuack();
  };

  const closeTip = () => {
    setIsTipOpen(false);
    setMood('idle');
  };

  return (
    <motion.div
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2"
      style={{ pointerEvents: 'none' }}
    >
      {/* Chat panel */}
      <AnimatePresence>
        {isChatOpen && (
          <div style={{ pointerEvents: 'auto' }}>
            <DuckChat
              context={context}
              onClose={() => {
                setIsChatOpen(false);
                setMood('idle');
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Tip bubble */}
      <AnimatePresence>
        {isTipOpen && !isChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.90 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            style={{ pointerEvents: 'auto' }}
            className="relative bg-slate-900 text-white px-4 py-3 rounded-2xl rounded-br-sm shadow-2xl max-w-[240px] border border-slate-700/60"
          >
            {/* close */}
            <button
              onClick={closeTip}
              className="absolute -top-2 -right-2 w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white border border-slate-700 shadow"
            >
              <X size={10} />
            </button>

            <motion.p
              key={tipText}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-[13px] font-medium leading-relaxed pr-1"
            >
              {tipText}
            </motion.p>

            {/* Switch to chat CTA */}
            <button
              onClick={switchToChat}
              className="mt-2 text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors"
            >
              <MessageSquare size={10} />
              Спросить Кря…
            </button>

            {/* Tail */}
            <div className="absolute -bottom-2 right-5 w-4 h-4 bg-slate-900 border-r border-b border-slate-700/60 transform rotate-45 z-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode toggle chips (visible when no panels open) */}
      <AnimatePresence>
        {!isChatOpen && !isTipOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ pointerEvents: 'auto' }}
            className="flex gap-1.5"
          >
            <button
              onClick={() => setMode('tip')}
              title="Режим подсказок"
              className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs border transition-all shadow ${
                mode === 'tip'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'bg-slate-900/80 border-white/10 text-slate-500 hover:text-slate-300'
              }`}
            >
              <Lightbulb size={13} />
            </button>
            <button
              onClick={() => setMode('chat')}
              title="Режим чата с AI"
              className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs border transition-all shadow ${
                mode === 'chat'
                  ? 'bg-primary/20 border-primary/40 text-primary'
                  : 'bg-slate-900/80 border-white/10 text-slate-500 hover:text-slate-300'
              }`}
            >
              <MessageSquare size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Duck button */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: [-2, 2, -2, 0] }}
        whileTap={{ scale: 0.88 }}
        animate={
          mood === 'sleeping'
            ? { y: [0, -3, 0], transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' } }
            : mood === 'excited'
            ? { y: [0, -8, 0, -4, 0], rotate: [-4, 4, -4, 0], transition: { duration: 0.5, repeat: 3 } }
            : mood === 'talking'
            ? { y: [0, -5, 0], transition: { duration: 0.6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' } }
            : mood === 'happy'
            ? { rotate: [0, -8, 8, -4, 4, 0], transition: { duration: 0.7, repeat: 2 } }
            : { y: [0, -4, 0], transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } } // idle float
        }
        onClick={handleDuckClick}
        style={{ pointerEvents: 'auto' }}
        title={
          mood === 'sleeping'
            ? 'Кря спит… кликни, чтобы разбудить!'
            : mode === 'chat'
            ? 'Открыть AI-чат с Кря'
            : 'Совет от Кря'
        }
        className="relative w-[82px] h-[82px] rounded-2xl bg-slate-900 border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center justify-center group overflow-hidden cursor-pointer"
      >
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/8 to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Pulse ring when talking */}
        {(mood === 'talking' || mood === 'excited') && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.3, 1], opacity: [0, 0.35, 0] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="absolute inset-0 bg-amber-400 rounded-2xl"
          />
        )}

        {/* Pending badge */}
        {context.pendingBookings > 0 && !isChatOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900 z-20"
          >
            {context.pendingBookings}
          </motion.div>
        )}

        {/* Mode indicator */}
        <div className={`absolute bottom-1 right-1.5 text-[8px] font-bold z-10 ${
          mode === 'chat' ? 'text-primary' : 'text-amber-400/60'
        }`}>
          {mode === 'chat' ? 'AI' : '💡'}
        </div>

        {/* Duck */}
        <div className="relative z-10">
          <PixelDuck size={66} mood={mood} />
        </div>
      </motion.button>
    </motion.div>
  );
}
