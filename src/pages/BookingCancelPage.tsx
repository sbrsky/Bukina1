import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, AlertCircle, Calendar } from 'lucide-react';
import { getBookingByToken, cancelBookingByToken } from '../lib/bookings';
import type { Booking } from '../types/booking';

const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDate(dateStr: string) {
  const [, m, d] = dateStr.split('-').map(Number);
  return `${d} ${MONTHS_RU[m - 1]}`;
}

export default function BookingCancelPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Отмена записи | SKINLAB';
    if (!token) {
      setError('Неверная ссылка. Токен отмены не найден.');
      setLoading(false);
      return;
    }
    getBookingByToken(token)
      .then((b) => {
        if (!b) setError('Запись не найдена. Проверьте ссылку.');
        else setBooking(b);
      })
      .catch(() => setError('Ошибка загрузки данных. Попробуйте позже.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleCancel() {
    if (!token) return;
    setCancelling(true);
    setError(null);
    try {
      await cancelBookingByToken(token);
      setCancelled(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка отмены. Попробуйте позже.');
    } finally {
      setCancelling(false);
    }
  }

  const alreadyCancelled =
    booking?.status === 'cancelled_by_client' ||
    booking?.status === 'cancelled_by_admin';

  return (
    <div className="min-h-screen bg-[#fdfdfb] pt-28 pb-24 px-5 sm:px-10 lg:px-16 flex items-start justify-center">
      <div className="w-full max-w-[480px]">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-colors mb-10 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">На главную</span>
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Отмена записи</h1>
        <p className="text-slate-400 text-sm mb-10">SKINLAB — Косметологический кабинет в Риге</p>

        <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm p-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-[#e5b9b9]" size={28} />
            </div>
          ) : error && !booking ? (
            <div className="flex flex-col items-center text-center py-8 gap-4">
              <AlertCircle className="text-red-400" size={40} />
              <p className="text-slate-600 text-sm">{error}</p>
              <Link to="/" className="text-[#e5b9b9] text-sm font-medium hover:underline">
                Вернуться на главную
              </Link>
            </div>
          ) : cancelled ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center text-center py-4 gap-5"
            >
              <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center">
                <CheckCircle2 className="text-green-500" size={32} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Запись отменена</h3>
                <p className="text-sm text-slate-500">
                  Ваш слот освобождён. Будем рады видеть вас снова!
                </p>
              </div>
              <Link
                to="/booking"
                className="px-6 py-3 rounded-2xl bg-[#e5b9b9] text-white font-bold text-sm hover:brightness-95 transition-all"
              >
                Записаться снова
              </Link>
            </motion.div>
          ) : alreadyCancelled ? (
            <div className="flex flex-col items-center text-center py-8 gap-4">
              <XCircle className="text-slate-300" size={40} />
              <div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">Запись уже отменена</h3>
                <p className="text-sm text-slate-400">Эта запись была ранее отменена.</p>
              </div>
              <Link to="/booking" className="text-[#e5b9b9] text-sm font-medium hover:underline">
                Записаться снова
              </Link>
            </div>
          ) : booking ? (
            <div className="space-y-6">
              {/* Booking summary */}
              <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={16} className="text-[#e5b9b9]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Детали записи
                  </span>
                </div>
                <Row label="Процедура" value={booking.serviceName} />
                <Row label="Дата" value={formatDate(booking.date)} />
                <Row label="Время" value={booking.time} />
                <Row label="Клиент" value={booking.client.name} />
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 text-sm flex items-start gap-3">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>
                  После отмены слот станет доступен другим клиентам. Это действие необратимо.
                </span>
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}

              <button
                onClick={handleCancel}
                disabled={cancelling}
                id="cancel-booking-btn"
                className="w-full py-4 rounded-2xl font-bold text-white bg-red-400 hover:bg-red-500 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {cancelling ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Отменяем...
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    Отменить запись
                  </>
                )}
              </button>

              <Link
                to="/"
                className="block text-center text-sm text-slate-400 hover:text-primary transition-colors"
              >
                Не отменять — вернуться на сайт
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-800 font-medium text-right">{value}</span>
    </div>
  );
}
