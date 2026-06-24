import { useState, useEffect, useCallback } from 'react';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Loader2,
  Clock,
  CalendarDays,
  Check,
  X,
  User,
  Sparkles,
  Sun,
  CloudSun,
  CalendarRange,
} from 'lucide-react';
import {
  createSlot,
  createSlotsBatch,
  deleteSlot,
  getSlotsByDate,
  getSlotsByMonth,
  DEFAULT_SLOT_TIMES,
  MORNING_SLOTS,
  AFTERNOON_SLOTS,
} from '../../lib/slots';
import type { Slot } from '../../types/booking';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];
const DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function toYMD(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOffset(year: number, month: number) {
  const raw = new Date(year, month, 1).getDay();
  return (raw + 6) % 7;
}

// Slot count per date for calendar badges
type SlotCounts = Record<string, { available: number; total: number }>;

// ─── Animated Stat Cards ──────────────────────────────────────────────────────

function StatCards({ total, available, daysCount, loading }: {
  total: number; available: number; daysCount: number; loading: boolean;
}) {
  const animTotal = useAnimatedCounter(loading ? 0 : total);
  const animAvail = useAnimatedCounter(loading ? 0 : available);
  const animDays  = useAnimatedCounter(loading ? 0 : daysCount);

  const cards = [
    { label: 'Слотов в месяце', value: animTotal, icon: CalendarRange, color: 'from-blue-500/15 to-blue-600/5 border-blue-500/15' },
    { label: 'Свободно', value: animAvail, icon: Check, color: 'from-emerald-500/15 to-emerald-600/5 border-emerald-500/15' },
    { label: 'Дней со слотами', value: animDays, icon: CalendarDays, color: 'from-violet-500/15 to-violet-600/5 border-violet-500/15' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {cards.map(({ label, value, icon: Icon, color }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 * i, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className={`bg-gradient-to-br ${color} border rounded-2xl p-4 flex items-center gap-3`}
        >
          <Icon size={16} className="text-slate-400" />
          <div>
            <div className="text-2xl font-bold text-white tabular-nums">{loading ? '—' : value}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SlotsManager() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [daySlots, setDaySlots] = useState<Slot[]>([]);
  const [dayLoading, setDayLoading] = useState(false);

  const [slotCounts, setSlotCounts] = useState<SlotCounts>({});
  const [monthLoading, setMonthLoading] = useState(false);

  const [addingTime, setAddingTime] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const yearMonth = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  // Load month overview (slot counts per day)
  const loadMonth = useCallback(async () => {
    setMonthLoading(true);
    try {
      const slots = await getSlotsByMonth(yearMonth);
      const counts: SlotCounts = {};
      for (const slot of slots) {
        if (!counts[slot.date]) counts[slot.date] = { available: 0, total: 0 };
        counts[slot.date].total++;
        if (slot.isAvailable) counts[slot.date].available++;
      }
      setSlotCounts(counts);
    } catch {
      showToast('Ошибка загрузки данных', 'error');
    } finally {
      setMonthLoading(false);
    }
  }, [yearMonth]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  // Load day detail
  const loadDay = useCallback(async (date: string) => {
    setDayLoading(true);
    try {
      const slots = await getSlotsByDate(date);
      setDaySlots(slots);
    } catch {
      showToast('Ошибка загрузки слотов', 'error');
    } finally {
      setDayLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate) loadDay(selectedDate);
  }, [selectedDate, loadDay]);

  function showToast(msg: string, type: 'success' | 'error' | 'info' = 'success') {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(null), 3000);
  }

  // ── Add slot ───────────────────────────────────────────────────────────────
  async function handleAddSlot(time: string) {
    if (!selectedDate) return;
    if (daySlots.some((s) => s.time === time)) {
      showToast(`Слот ${time} уже существует`, 'info');
      return;
    }
    setAddingTime(time);
    try {
      await createSlot(selectedDate, time);
      await loadDay(selectedDate);
      await loadMonth();
      showToast(`Слот ${time} добавлен`);
    } catch {
      showToast('Ошибка при создании слота', 'error');
    } finally {
      setAddingTime(null);
    }
  }

  // ── Add batch ──────────────────────────────────────────────────────────────
  async function handleAddBatch(times: string[]) {
    if (!selectedDate) return;
    const newTimes = times.filter((t) => !daySlots.some((s) => s.time === t));
    if (!newTimes.length) { showToast('Все эти слоты уже существуют', 'info'); return; }
    setAddingTime('batch');
    try {
      await createSlotsBatch(selectedDate, newTimes);
      await loadDay(selectedDate);
      await loadMonth();
      showToast(`Добавлено ${newTimes.length} слотов`);
    } catch {
      showToast('Ошибка при создании слотов', 'error');
    } finally {
      setAddingTime(null);
    }
  }

  // ── Delete slot ────────────────────────────────────────────────────────────
  async function handleDelete(slot: Slot) {
    if (!slot.isAvailable) {
      showToast('Нельзя удалить занятый слот — сначала отмените запись', 'error');
      return;
    }
    setDeletingId(slot.id);
    try {
      await deleteSlot(slot.id);
      setDaySlots((prev) => prev.filter((s) => s.id !== slot.id));
      await loadMonth();
      showToast(`Слот ${slot.time} удалён`);
    } catch {
      showToast('Ошибка при удалении', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  // ── Calendar nav ───────────────────────────────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const offset = getFirstDayOffset(viewYear, viewMonth);
  const todayStr = toYMD(today.getFullYear(), today.getMonth(), today.getDate());

  // Stats
  const totalSlotsMonth = Object.values(slotCounts).reduce<number>((s, c) => s + (c as {total: number}).total, 0);
  const availableSlotsMonth = Object.values(slotCounts).reduce<number>((s, c) => s + (c as {available: number}).available, 0);
  const daysWithSlots = Object.keys(slotCounts).length;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-5 right-5 z-50 text-sm px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl border ${
              toastType === 'success'
                ? 'bg-emerald-500/90 border-emerald-400/30 text-white'
                : toastType === 'error'
                ? 'bg-red-500/90 border-red-400/30 text-white'
                : 'bg-slate-700/90 border-white/10 text-white'
            }`}
          >
            {toastType === 'success' && <Check size={15} />}
            {toastType === 'error' && <X size={15} />}
            {toastType === 'info' && <Sparkles size={15} />}
            <span className="font-medium">{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <CalendarDays size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Управление слотами</h1>
            <p className="text-slate-500 text-sm">
              Выберите день, чтобы добавить или удалить временные слоты
            </p>
          </div>
        </div>
      </div>

      {/* Month stats — animated counters */}
      <StatCards
        total={totalSlotsMonth}
        available={availableSlotsMonth}
        daysCount={daysWithSlots}
        loading={monthLoading}
      />

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* ── Calendar ────────────────────────────────────────────────── */}
        <div className="flex-1 bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-3xl p-6 backdrop-blur-sm">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-bold text-lg">
              {MONTHS_RU[viewMonth]}
              <span className="text-slate-500 font-normal ml-2">{viewYear}</span>
            </h2>
            <div className="flex gap-1">
              <button
                onClick={prevMonth}
                aria-label="Предыдущий месяц"
                className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12] transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={nextMonth}
                aria-label="Следующий месяц"
                className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12] transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-3">
            {DAYS_RU.map((d) => (
              <div key={d} className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-wider py-2">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const dateStr = toYMD(viewYear, viewMonth, day);
              const isPast = dateStr < todayStr;
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const counts = slotCounts[dateStr];
              const hasSlots = counts && counts.total > 0;
              const allBooked = hasSlots && counts.available === 0;

              return (
                <button
                  key={day}
                  onClick={() => !isPast && setSelectedDate(dateStr)}
                  disabled={isPast}
                  aria-label={`${day} ${MONTHS_RU[viewMonth]}`}
                  aria-pressed={isSelected}
                  className={`relative h-14 w-full rounded-xl flex flex-col items-center justify-center text-xs transition-all duration-200 group ${
                    isSelected
                      ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-[1.02]'
                      : isPast
                      ? 'opacity-20 cursor-not-allowed'
                      : isToday
                      ? 'bg-primary/10 border border-primary/30 text-primary'
                      : hasSlots
                      ? 'bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] hover:scale-[1.02]'
                      : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
                  }`}
                >
                  <span className={`font-bold leading-none ${isSelected ? 'text-base' : ''}`}>{day}</span>
                  {counts && (
                    <span className={`text-[9px] font-semibold mt-0.5 tabular-nums ${
                      isSelected ? 'text-white/70' :
                      allBooked ? 'text-red-400' :
                      'text-emerald-400'
                    }`}>
                      {counts.available}/{counts.total}
                    </span>
                  )}
                  {/* Dot indicator for days with slots */}
                  {hasSlots && !isSelected && !counts && (
                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary/50" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-5 mt-5 pt-4 border-t border-white/[0.06] text-[10px] text-slate-600 font-medium">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
              Свободные / Всего
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
              Все заняты
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full ring-2 ring-primary/40 bg-transparent" />
              Сегодня
            </span>
          </div>
        </div>

        {/* ── Day panel ───────────────────────────────────────────────── */}
        <div className="w-full lg:w-[340px] flex-shrink-0">
          <AnimatePresence mode="wait">
            {!selectedDate ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col items-center justify-center text-slate-600 py-24"
              >
                <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                  <CalendarDays size={24} className="opacity-30" />
                </div>
                <p className="text-sm">Выберите дату в календаре</p>
                <p className="text-xs text-slate-700 mt-1">Нажмите на день для управления слотами</p>
              </motion.div>
            ) : (
              <motion.div
                key={selectedDate}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] rounded-3xl p-5 space-y-5 backdrop-blur-sm"
              >
                {/* Day header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">
                        {(() => {
                          const [,, d] = selectedDate.split('-').map(Number);
                          return d;
                        })()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">
                        {(() => {
                          const [, m, d] = selectedDate.split('-').map(Number);
                          return `${d} ${MONTHS_SHORT[m - 1]}`;
                        })()}
                      </h3>
                      <span className="text-xs text-slate-500">
                        {daySlots.length} {daySlots.length === 1 ? 'слот' : daySlots.length < 5 ? 'слота' : 'слотов'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Quick add templates */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Быстрое заполнение
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAddBatch(MORNING_SLOTS)}
                      disabled={addingTime === 'batch'}
                      className="px-3 py-2.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/[0.12] text-xs text-amber-300/90 hover:bg-amber-500/[0.12] hover:border-amber-500/[0.2] transition-all flex items-center gap-2 font-medium disabled:opacity-50"
                    >
                      <Sun size={13} />
                      Утро (9–12)
                    </button>
                    <button
                      onClick={() => handleAddBatch(AFTERNOON_SLOTS)}
                      disabled={addingTime === 'batch'}
                      className="px-3 py-2.5 rounded-xl bg-sky-500/[0.06] border border-sky-500/[0.12] text-xs text-sky-300/90 hover:bg-sky-500/[0.12] hover:border-sky-500/[0.2] transition-all flex items-center gap-2 font-medium disabled:opacity-50"
                    >
                      <CloudSun size={13} />
                      День (13–18)
                    </button>
                  </div>
                  <button
                    onClick={() => handleAddBatch(DEFAULT_SLOT_TIMES)}
                    disabled={addingTime === 'batch'}
                    className="w-full px-3 py-2.5 rounded-xl bg-primary/[0.08] border border-primary/[0.15] text-xs text-primary hover:bg-primary/[0.15] hover:border-primary/[0.25] transition-all flex items-center justify-center gap-2 font-bold disabled:opacity-50"
                  >
                    {addingTime === 'batch' ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <CalendarRange size={13} />
                    )}
                    Весь день (9:00–18:00)
                  </button>
                </div>

                {/* Individual time slots */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Отдельные слоты
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DEFAULT_SLOT_TIMES.map((t) => {
                      const exists = daySlots.some((s) => s.time === t);
                      const isAdding = addingTime === t;
                      return (
                        <button
                          key={t}
                          onClick={() => handleAddSlot(t)}
                          disabled={exists || isAdding}
                          className={`py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                            exists
                              ? 'bg-emerald-500/[0.06] border border-emerald-500/[0.12] text-emerald-400/60 cursor-default'
                              : isAdding
                              ? 'bg-primary/10 border border-primary/20 text-primary'
                              : 'bg-white/[0.03] border border-white/[0.08] text-slate-400 hover:bg-primary/[0.08] hover:text-primary hover:border-primary/[0.2]'
                          }`}
                        >
                          {isAdding ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : exists ? (
                            <Check size={10} />
                          ) : (
                            <Plus size={10} />
                          )}
                          {t}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom time */}
                  {showCustom ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex gap-2"
                    >
                      <input
                        type="time"
                        value={customTime}
                        onChange={(e) => setCustomTime(e.target.value)}
                        className="flex-1 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-white text-sm outline-none focus:border-primary/50 transition-all"
                      />
                      <button
                        onClick={async () => {
                          if (customTime) {
                            await handleAddSlot(customTime);
                            setCustomTime('');
                            setShowCustom(false);
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:brightness-110 transition-all"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setShowCustom(false)}
                        className="px-3 py-2 rounded-xl bg-white/[0.04] text-slate-500 text-xs hover:text-white transition-all"
                      >
                        <X size={14} />
                      </button>
                    </motion.div>
                  ) : (
                    <button
                      onClick={() => setShowCustom(true)}
                      className="w-full py-2.5 rounded-xl border border-dashed border-white/[0.1] text-xs text-slate-600 hover:text-slate-300 hover:border-white/[0.2] transition-all flex items-center justify-center gap-2"
                    >
                      <Clock size={12} />
                      Другое время
                    </button>
                  )}
                </div>

                {/* Existing slots list */}
                {dayLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={18} className="text-primary animate-spin" />
                  </div>
                ) : daySlots.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-slate-600 text-xs text-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center mb-3">
                      <Clock size={18} className="opacity-30" />
                    </div>
                    <p className="font-medium">Слоты не добавлены</p>
                    <p className="text-slate-700 mt-1">Используйте кнопки выше</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                        Слоты дня
                      </p>
                      <span className="text-[10px] text-slate-600 tabular-nums">
                        {daySlots.filter(s => s.isAvailable).length} свободно
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {daySlots.map((slot) => (
                        <motion.div
                          key={slot.id}
                          layout
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm transition-all ${
                            slot.isAvailable
                              ? 'bg-emerald-500/[0.04] border-emerald-500/[0.12]'
                              : 'bg-red-500/[0.04] border-red-500/[0.1]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              slot.isAvailable ? 'bg-emerald-400' : 'bg-red-400'
                            }`} />
                            <span className="font-bold text-xs text-white/90 w-11 tabular-nums">{slot.time}</span>
                            {slot.isAvailable ? (
                              <span className="text-[10px] text-emerald-400/60 font-medium">свободен</span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] text-red-400/60 font-medium">
                                <User size={9} />
                                забронирован
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(slot)}
                            disabled={!slot.isAvailable || deletingId === slot.id}
                            title={slot.isAvailable ? 'Удалить' : 'Нельзя удалить забронированный слот'}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                          >
                            {deletingId === slot.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
