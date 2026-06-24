import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { seedDatabase } from '../../lib/seed';
import { motion } from 'motion/react';
import {
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Database,
  RefreshCw,
} from 'lucide-react';

interface Booking {
  id: string;
  name: string;
  phone: string;
  email: string;
  service: string;
  treatment: string;
  date: string;
  time: string;
  status: 'new' | 'confirmed' | 'cancelled';
  createdAt: any;
}

const STATUS_CONFIG = {
  new: { label: 'Новая', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: Clock },
  confirmed: { label: 'Подтверждена', color: 'text-green-400 bg-green-400/10 border-green-400/20', icon: CheckCircle },
  cancelled: { label: 'Отменена', color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: XCircle },
};

export default function Dashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    setLoading(true);
    try {
      const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(10));
      const snap = await getDocs(q);
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)));
    } catch (e) {
      // Collection might not exist yet
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(bookingId: string, status: Booking['status']) {
    await updateDoc(doc(db, 'bookings', bookingId), { status });
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status } : b))
    );
  }

  async function handleSeed() {
    if (!confirm('Это заполнит базу данных начальными данными. Существующие записи будут перезаписаны. Продолжить?')) return;
    setSeedLoading(true);
    setSeedMessage('');
    const result = await seedDatabase();
    setSeedMessage(result.message);
    setSeedLoading(false);
  }

  const stats = [
    { label: 'Всего записей', value: bookings.length, icon: Users, color: 'text-primary' },
    { label: 'Новых', value: bookings.filter((b) => b.status === 'new').length, icon: AlertCircle, color: 'text-amber-400' },
    { label: 'Подтверждено', value: bookings.filter((b) => b.status === 'confirmed').length, icon: CheckCircle, color: 'text-green-400' },
    { label: 'Отменено', value: bookings.filter((b) => b.status === 'cancelled').length, icon: XCircle, color: 'text-red-400' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Дашборд</h1>
          <p className="text-slate-400 text-sm mt-1">Обзор активности сайта</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadBookings}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all text-sm"
          >
            <RefreshCw size={14} />
            Обновить
          </button>
          <button
            onClick={handleSeed}
            disabled={seedLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all text-sm disabled:opacity-50"
          >
            <Database size={14} />
            {seedLoading ? 'Заполняем...' : 'Заполнить БД'}
          </button>
        </div>
      </div>

      {/* Seed message */}
      {seedMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm"
        >
          {seedMessage}
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/3 border border-white/8 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-medium">{stat.label}</span>
              <stat.icon size={16} className={stat.color} />
            </div>
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Recent bookings */}
      <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
          <Calendar size={16} className="text-primary" />
          <h2 className="text-white font-semibold text-sm">Последние записи</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-500">
            <Calendar size={32} className="mb-3 opacity-30" />
            <p className="text-sm">Записей пока нет</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-slate-500 font-medium px-6 py-3">Клиент</th>
                  <th className="text-left text-slate-500 font-medium px-4 py-3">Процедура</th>
                  <th className="text-left text-slate-500 font-medium px-4 py-3">Дата / Время</th>
                  <th className="text-left text-slate-500 font-medium px-4 py-3">Статус</th>
                  <th className="text-left text-slate-500 font-medium px-4 py-3">Действие</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.new;
                  return (
                    <tr key={booking.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{booking.name}</div>
                        <div className="text-slate-500 text-xs">{booking.phone}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-slate-300">{booking.treatment}</div>
                        <div className="text-slate-600 text-xs">{booking.service}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-slate-300">{booking.date}</div>
                        <div className="text-slate-500 text-xs">{booking.time}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                          <status.icon size={10} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={booking.status}
                          onChange={(e) => handleStatusChange(booking.id, e.target.value as Booking['status'])}
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-primary/40"
                        >
                          <option value="new">Новая</option>
                          <option value="confirmed">Подтвердить</option>
                          <option value="cancelled">Отменить</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
