import { useState, useEffect, useMemo } from 'react';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  User,
  AlertTriangle,
  Banknote,
  Loader2,
  X,
  CalendarCheck,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { cancelBookingByAdmin, updateBookingStatus } from '../../lib/bookings';
import type { Booking, BookingStatus } from '../../types/booking';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BookingStatus, { label: string; badge: string; dot: string; icon: string }> = {
  pending: {
    label: 'Новая',
    badge: 'text-amber-300 bg-amber-500/10 border-amber-500/15',
    dot: 'bg-amber-400',
    icon: '🕐',
  },
  confirmed: {
    label: 'Подтверждена',
    badge: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/15',
    dot: 'bg-emerald-400',
    icon: '✓',
  },
  cancelled_by_client: {
    label: 'Отменена клиентом',
    badge: 'text-red-300 bg-red-500/10 border-red-500/15',
    dot: 'bg-red-400',
    icon: '✗',
  },
  cancelled_by_admin: {
    label: 'Отменена нами',
    badge: 'text-slate-400 bg-slate-500/10 border-slate-500/15',
    dot: 'bg-slate-500',
    icon: '✗',
  },
  completed: {
    label: 'Завершена',
    badge: 'text-violet-300 bg-violet-500/10 border-violet-500/15',
    dot: 'bg-violet-400',
    icon: '✦',
  },
};

type FilterKey = 'all' | BookingStatus;

const FILTERS: { key: FilterKey; label: string; color: string }[] = [
  { key: 'all', label: 'Все', color: 'text-white' },
  { key: 'pending', label: 'Новые', color: 'text-amber-400' },
  { key: 'confirmed', label: 'Подтверждённые', color: 'text-emerald-400' },
  { key: 'completed', label: 'Завершённые', color: 'text-violet-400' },
  { key: 'cancelled_by_client', label: 'Отменены', color: 'text-red-400' },
  { key: 'cancelled_by_admin', label: 'Отменены нами', color: 'text-slate-400' },
];

// ─── Months ───────────────────────────────────────────────────────────────────
const MONTHS_RU = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  const [, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MONTHS_RU[m - 1]}`;
}

function timeAgo(createdAt: any): string {
  if (!createdAt?.toDate) return '';
  const diff = Date.now() - createdAt.toDate().getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}ч назад`;
  const days = Math.floor(hours / 24);
  return `${days}д назад`;
}

// ─── Animated Stat Cards ──────────────────────────────────────────────────────

function BookingStatCards({ counts, loading }: {
  counts: Record<string, number>;
  loading: boolean;
}) {
  const animAll       = useAnimatedCounter(loading ? 0 : counts.all);
  const animPending   = useAnimatedCounter(loading ? 0 : counts.pending);
  const animConfirmed = useAnimatedCounter(loading ? 0 : counts.confirmed);
  const animCompleted = useAnimatedCounter(loading ? 0 : counts.completed);

  const cards = [
    { label: 'Всего', value: animAll, icon: TrendingUp, gradient: 'from-blue-500/10 to-blue-600/5 border-blue-500/10' },
    { label: 'Новых', value: animPending, icon: Sparkles, gradient: 'from-amber-500/10 to-amber-600/5 border-amber-500/10' },
    { label: 'Подтверждено', value: animConfirmed, icon: CheckCircle, gradient: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/10' },
    { label: 'Завершено', value: animCompleted, icon: CalendarCheck, gradient: 'from-violet-500/10 to-violet-600/5 border-violet-500/10' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      {cards.map(({ label, value, icon: Icon, gradient }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 * i, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className={`bg-gradient-to-br ${gradient} border rounded-2xl p-4 flex items-center gap-3`}
        >
          <Icon size={16} className="text-slate-500" />
          <div>
            <div className="text-xl font-bold text-white tabular-nums">{loading ? '—' : value}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BookingsManager() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selected, setSelected] = useState<Booking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => { loadBookings(); }, []);

  async function loadBookings() {
    setLoading(true);
    try {
      const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)));
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(booking: Booking) {
    setActionLoading(true);
    try {
      await updateBookingStatus(booking.id, 'confirmed');
      updateLocal(booking.id, { status: 'confirmed' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleComplete(booking: Booking) {
    setActionLoading(true);
    try {
      await updateBookingStatus(booking.id, 'completed');
      updateLocal(booking.id, { status: 'completed' });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelByAdmin(booking: Booking) {
    setActionLoading(true);
    try {
      await cancelBookingByAdmin(booking.id, cancelReason || 'Отменено администратором');
      updateLocal(booking.id, {
        status: 'cancelled_by_admin',
        cancellation: {
          reason: cancelReason || 'Отменено администратором',
          cancelledBy: 'admin',
          cancelledAt: { toDate: () => new Date() } as any,
        },
      });
      setShowCancelConfirm(false);
      setCancelReason('');
    } finally {
      setActionLoading(false);
    }
  }

  function updateLocal(id: string, patch: Partial<Booking>) {
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, ...patch } : b));
    setSelected((s) => s?.id === id ? { ...s, ...patch } : s);
  }

  const isCancelled = (b: Booking) =>
    b.status === 'cancelled_by_admin' || b.status === 'cancelled_by_client';

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  const counts = useMemo(() => ({
    all: bookings.length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    confirmed: bookings.filter((b) => b.status === 'confirmed').length,
    cancelled_by_client: bookings.filter((b) => b.status === 'cancelled_by_client').length,
    cancelled_by_admin: bookings.filter((b) => b.status === 'cancelled_by_admin').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
  }), [bookings]);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <CalendarCheck size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Бронирования</h1>
            <p className="text-slate-500 text-sm">
              {bookings.length} {bookings.length === 1 ? 'запись' : bookings.length < 5 ? 'записи' : 'записей'}
              {counts.pending > 0 && (
                <span className="text-amber-400 ml-2">• {counts.pending} новых</span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={loadBookings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.08] text-sm font-medium transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Обновить
        </button>
      </div>

      {/* Quick stats — animated counters */}
      <BookingStatCards counts={counts} loading={loading} />

      {/* Filter tabs */}
      <div className="flex gap-1 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-1.5 mb-6 overflow-x-auto">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              filter === key
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
            }`}
          >
            {label}
            {counts[key] > 0 && (
              <span className={`tabular-nums text-[10px] px-1.5 py-0.5 rounded-md ${
                filter === key ? 'bg-white/20' : 'bg-white/[0.05]'
              }`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-5">
        {/* List */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={24} className="text-primary animate-spin mb-3" />
              <p className="text-slate-600 text-sm">Загрузка записей...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-slate-600">
              <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
                <Calendar size={24} className="opacity-30" />
              </div>
              <p className="text-sm font-medium">Нет записей</p>
              <p className="text-xs text-slate-700 mt-1">
                {filter !== 'all' ? 'Попробуйте другой фильтр' : 'Записи появятся после первого бронирования'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((booking) => {
                const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
                const isSelected = selected?.id === booking.id;

                return (
                  <motion.div
                    key={booking.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelected(isSelected ? null : booking)}
                    className={`cursor-pointer bg-gradient-to-r border rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 group ${
                      isSelected
                        ? 'from-primary/[0.06] to-primary/[0.02] border-primary/30'
                        : 'from-white/[0.03] to-transparent border-white/[0.06] hover:from-white/[0.05] hover:border-white/[0.1]'
                    }`}
                  >
                    {/* Status indicator */}
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-slate-950 ${status.dot}`} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <span className="text-white font-semibold text-sm">{booking.client?.name || '—'}</span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold border ${status.badge}`}>
                          {status.label}
                        </span>
                        {booking.payment?.status === 'paid' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border text-emerald-300 bg-emerald-500/10 border-emerald-500/15">
                            <Banknote size={9} />
                            Оплачено
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Calendar size={11} />
                          {formatDate(booking.date)} • {booking.time}
                        </span>
                        <span className="truncate text-slate-600">{booking.serviceName}</span>
                        <span className="text-slate-700">{timeAgo(booking.createdAt)}</span>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                      {booking.status === 'pending' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleConfirm(booking); }}
                          disabled={actionLoading}
                          title="Подтвердить"
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      {booking.status === 'confirmed' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleComplete(booking); }}
                          disabled={actionLoading}
                          title="Завершить"
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-violet-400/70 hover:text-violet-400 hover:bg-violet-500/10 transition-all"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      {!isCancelled(booking) && booking.status !== 'completed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(booking);
                            setShowCancelConfirm(true);
                          }}
                          title="Отменить"
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail side panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, x: 20, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-80 flex-shrink-0 bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/[0.08] rounded-3xl p-6 self-start sticky top-5 space-y-5 backdrop-blur-sm"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${(STATUS_CONFIG[selected.status] || STATUS_CONFIG.pending).dot}`} />
                  <h3 className="text-white font-semibold text-sm">Детали записи</h3>
                </div>
                <button
                  onClick={() => { setSelected(null); setShowCancelConfirm(false); }}
                  className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Client card */}
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 flex items-center justify-center">
                    <User size={16} className="text-primary/80" />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{selected.client?.name}</div>
                    <div className="text-slate-600 text-[10px] uppercase tracking-wider font-medium">Клиент</div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 pl-[52px]">
                  <a href={`tel:${selected.client?.phone}`} className="flex items-center gap-2 text-slate-300 hover:text-white text-xs transition-colors group/link">
                    <Phone size={12} className="text-slate-500 group-hover/link:text-primary" />
                    {selected.client?.phone}
                  </a>
                  {selected.client?.email && (
                    <a href={`mailto:${selected.client?.email}`} className="flex items-center gap-2 text-slate-300 hover:text-white text-xs transition-colors group/link">
                      <Mail size={12} className="text-slate-500 group-hover/link:text-primary" />
                      {selected.client?.email}
                    </a>
                  )}
                </div>
              </div>

              {/* Service & datetime */}
              <div className="space-y-3">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                  <div className="text-slate-600 text-[10px] uppercase tracking-wider font-bold">Услуга</div>
                  <div className="text-white text-sm font-semibold">{selected.serviceName}</div>
                  <div className="text-slate-500 text-xs">{selected.serviceDuration} • {selected.servicePrice}</div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center gap-2">
                    <Calendar size={13} className="text-slate-500" />
                    <span className="text-white text-sm font-medium">{formatDate(selected.date)}</span>
                  </div>
                  <div className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center gap-2">
                    <Clock size={13} className="text-slate-500" />
                    <span className="text-white text-sm font-medium tabular-nums">{selected.time}</span>
                  </div>
                </div>
              </div>

              {/* Comment */}
              {selected.client?.comment && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                  <div className="text-slate-600 text-[10px] uppercase tracking-wider font-bold mb-2">Комментарий</div>
                  <div className="text-slate-300 text-xs leading-relaxed">{selected.client.comment}</div>
                </div>
              )}

              {/* Cancellation info */}
              {selected.cancellation && (
                <div className="bg-red-500/[0.05] border border-red-500/[0.1] rounded-2xl p-4 space-y-1">
                  <div className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Причина отмены</div>
                  <div className="text-red-300 text-xs font-medium">{selected.cancellation.reason}</div>
                </div>
              )}

              {/* Cancel confirm panel */}
              {showCancelConfirm && !isCancelled(selected) && selected.status !== 'completed' ? (
                <div className="bg-red-500/[0.04] border border-red-500/[0.1] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-medium">
                    <AlertTriangle size={13} />
                    Слот будет освобождён. Действие необратимо.
                  </div>
                  <input
                    placeholder="Причина отмены (опционально)"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-xs outline-none focus:border-red-400/40 placeholder:text-slate-600 transition-all"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCancelByAdmin(selected)}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 rounded-xl bg-red-500/15 border border-red-500/20 text-red-300 text-xs font-bold hover:bg-red-500/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                      {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                      Отменить запись
                    </button>
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="flex-1 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 text-xs font-medium hover:text-white transition-all"
                    >
                      Назад
                    </button>
                  </div>
                </div>
              ) : (
                /* Action buttons */
                !isCancelled(selected) && selected.status !== 'completed' && (
                  <div className="flex flex-col gap-2">
                    {selected.status === 'pending' && (
                      <button
                        onClick={() => handleConfirm(selected)}
                        disabled={actionLoading}
                        className="w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/15 text-emerald-300 text-xs font-bold hover:bg-emerald-500/20 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={13} />
                        Подтвердить
                      </button>
                    )}
                    {selected.status === 'confirmed' && (
                      <button
                        onClick={() => handleComplete(selected)}
                        disabled={actionLoading}
                        className="w-full py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/15 text-violet-300 text-xs font-bold hover:bg-violet-500/20 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
                      >
                        <CalendarCheck size={13} />
                        Отметить завершённой
                      </button>
                    )}
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="w-full py-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/[0.1] text-red-400/80 text-xs font-medium hover:bg-red-500/[0.12] hover:text-red-300 transition-all flex items-center justify-center gap-2"
                    >
                      <XCircle size={13} />
                      Отменить запись
                    </button>
                  </div>
                )
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
