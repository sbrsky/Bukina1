import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAvailableSlots } from '../hooks/useAvailableSlots';
import { createBooking } from '../lib/bookings';
import type { SelectedService, BookingFormData, Booking } from '../types/booking';
import { useT } from '../hooks/useT';
import { useLang } from '../context/LangContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Locale-aware calendar labels ────────────────────────────────────────────
const DAYS: Record<string, string[]> = {
  ru: ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'],
  en: ['Mo','Tu','We','Th','Fr','Sa','Su'],
  lv: ['Pr','Ot','Tr','Ce','Pk','Se','Sv'],
  uk: ['Пн','Вт','Ср','Чт','Пт','Сб','Нд'],
  lt: ['Pr','An','Tr','Kt','Pn','Š','Sk'],
  et: ['E','T','K','N','R','L','P'],
  es: ['Lu','Ma','Mi','Ju','Vi','Sá','Do'],
};
const MONTHS: Record<string, string[]> = {
  ru: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  lv: ['Janvāris','Februāris','Marts','Aprīlis','Maijs','Jūnijs','Jūlijs','Augusts','Septembris','Oktobris','Novembris','Decembris'],
  uk: ['Січень','Лютий','Березень','Квітень','Травень','Червень','Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'],
  lt: ['Sausis','Vasaris','Kovas','Balandis','Gegužė','Birželis','Liepa','Rugpjūtis','Rugsėjis','Spalis','Lapkritis','Gruodis'],
  et: ['Jaanuar','Veebruar','Märts','Aprill','Mai','Juuni','Juuli','August','September','Oktoober','November','Detsember'],
  es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
};

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/** Day-of-week for the 1st of month: Mon=0..Sun=6 */
function getFirstDayOffset(year: number, month: number) {
  const rawDay = new Date(year, month, 1).getDay(); // Sun=0..Sat=6
  return (rawDay + 6) % 7; // Mon=0..Sun=6
}

// ─── Service loader ───────────────────────────────────────────────────────────

interface ServiceDoc {
  id: string;
  name: string;
  name_ru?: string;
  duration?: string;
  price?: string;
  description?: string;
  description_ru?: string;
}

function mapService(doc: ServiceDoc): SelectedService {
  return {
    id: doc.id,
    name: doc.name_ru || doc.name,
    duration: doc.duration || '60 мин',
    price: doc.price || '',
    description: doc.description_ru || doc.description,
  };
}

// StepIndicator is rendered inside BookingPage with access to t()


// ─── Step 1: Select Service ───────────────────────────────────────────────────

function StepService({
  selected,
  onSelect,
}: {
  selected: SelectedService | null;
  onSelect: (s: SelectedService) => void;
}) {
  const [services, setServices] = useState<SelectedService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(
          query(collection(db, 'services'), orderBy('order', 'asc'))
        );
        const list = snap.docs.map((d) =>
          mapService({ id: d.id, ...(d.data() as Omit<ServiceDoc, 'id'>) })
        );
        setServices(list.length ? list : FALLBACK_SERVICES);
      } catch {
        setServices(FALLBACK_SERVICES);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-[#e5b9b9]" size={28} />
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {services.map((svc) => {
        const isSelected = selected?.id === svc.id;
        return (
          <button
            key={svc.id}
            id={`service-${svc.id}`}
            onClick={() => onSelect(svc)}
            className={`p-6 rounded-2xl border text-left transition-all duration-200 group relative overflow-hidden ${
              isSelected
                ? 'border-[#e5b9b9] bg-[#e5b9b9]/5 shadow-md shadow-[#e5b9b9]/10'
                : 'border-slate-100 hover:border-[#e5b9b9]/40 hover:shadow-sm bg-white'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="service-selection"
                className="absolute inset-0 bg-[#e5b9b9]/5 rounded-2xl"
                transition={{ duration: 0.2 }}
              />
            )}
            <div className="relative">
              <div className="flex items-start justify-between mb-2">
                <span className="font-bold text-slate-900 text-sm leading-snug">
                  {svc.name}
                </span>
                {isSelected && (
                  <Check size={16} className="text-[#e5b9b9] shrink-0 ml-2 mt-0.5" />
                )}
              </div>
              {svc.description && (
                <p className="text-xs text-slate-400 mb-3 leading-relaxed line-clamp-2">
                  {svc.description}
                </p>
              )}
              <span className="text-xs text-slate-400 font-medium">
                {svc.duration}
                {svc.price ? ` • ${svc.price}` : ''}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

const FALLBACK_SERVICES: SelectedService[] = [
  { id: 'cleansing', name: 'Чистка лица', duration: '90 мин', price: '60 €' },
  { id: 'peel', name: 'Химический пилинг', duration: '45 мин', price: '45 €' },
  { id: 'meso', name: 'Мезотерапия', duration: '60 мин', price: '80 €' },
  { id: 'biorev', name: 'Биоревитализация губ', duration: '45 мин', price: '90 €' },
  { id: 'lifting', name: 'Лифтинг-процедура', duration: '60 мин', price: '75 €' },
  { id: 'consult', name: 'Консультация', duration: '30 мин', price: '20 €' },
];

// ─── Step 2: Date & Time ──────────────────────────────────────────────────────

function StepDateTime({
  selectedDate,
  selectedSlotId,
  selectedTime,
  onDateChange,
  onSlotSelect,
  lang,
}: {
  selectedDate: string | null;
  selectedSlotId: string | null;
  selectedTime: string | null;
  onDateChange: (date: string) => void;
  onSlotSelect: (slotId: string, time: string) => void;
  lang: string;
}) {
  const t = useT();
  const DAYS_L = DAYS[lang] || DAYS.ru;
  const MONTHS_L = MONTHS[lang] || MONTHS.ru;
  const tomorrow = getTomorrow();
  const [viewYear, setViewYear] = useState(tomorrow.getFullYear());
  const [viewMonth, setViewMonth] = useState(tomorrow.getMonth());
  const { slots, loading: slotsLoading } = useAvailableSlots(selectedDate);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const offset = getFirstDayOffset(viewYear, viewMonth);

  const todayStr = toYMD(new Date());
  const tomorrowStr = toYMD(tomorrow);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  // Prevent going back before current month
  const todayDate = new Date();
  const canGoPrev =
    viewYear > todayDate.getFullYear() ||
    (viewYear === todayDate.getFullYear() && viewMonth > todayDate.getMonth());

  return (
    <div className="grid lg:grid-cols-[1fr_220px] gap-8">
      {/* Calendar */}
      <div className="border border-slate-100 rounded-2xl p-6 bg-white">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-900">
            {MONTHS_L[viewMonth]} {viewYear}
          </h3>
          <div className="flex gap-1">
            <button
              onClick={prevMonth}
              disabled={!canGoPrev}
              aria-label="Предыдущий месяц"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={nextMonth}
              aria-label="Следующий месяц"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {DAYS_L.map((d) => (
            <span key={d} className="text-[10px] font-bold text-slate-300 uppercase tracking-wider py-1">
              {d}
            </span>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for offset */}
          {Array.from({ length: offset }).map((_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isPast = dateStr <= todayStr;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;

            return (
              <button
                key={day}
                onClick={() => !isPast && onDateChange(dateStr)}
                disabled={isPast}
                aria-label={`${day} ${MONTHS_L[viewMonth]}`}
                aria-pressed={isSelected}
                className={`h-9 w-full rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[#e5b9b9] text-white font-bold shadow-sm'
                    : isPast
                    ? 'text-slate-200 cursor-not-allowed'
                    : isToday
                    ? 'border border-[#e5b9b9]/40 text-[#e5b9b9]'
                    : 'text-slate-600 hover:bg-[#e5b9b9]/10 hover:text-[#c9a0a0]'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      <div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
          {selectedDate
            ? (() => {
                const [, m, d] = selectedDate.split('-');
                return `${t('booking.slotsFor')} ${Number(d)} ${MONTHS_L[Number(m) - 1].toLowerCase()}`;
              })()
            : t('booking.selectDate')}
        </div>

        {!selectedDate ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-300">
            <Calendar size={32} className="mb-3" />
            <p className="text-sm">{t('booking.selectDateLeft')}</p>
          </div>
        ) : slotsLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-[#e5b9b9]" size={22} />
          </div>
        ) : slots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-300">
            <Clock size={28} className="mb-3" />
            <p className="text-sm text-center">{t('booking.noSlots')}<br/>{t('booking.tryAnother')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {slots.map((slot) => {
              const isSelected = slot.id === selectedSlotId;
              return (
                <button
                  key={slot.id}
                  onClick={() => onSlotSelect(slot.id, slot.time)}
                  aria-pressed={isSelected}
                  className={`py-3 px-2 rounded-xl border text-sm font-semibold transition-all ${
                    isSelected
                      ? 'bg-[#e5b9b9] text-white border-[#e5b9b9] shadow-sm'
                      : 'border-slate-100 text-slate-700 hover:border-[#e5b9b9]/50 hover:bg-[#e5b9b9]/5'
                  }`}
                >
                  {slot.time}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 3: Contact form ─────────────────────────────────────────────────────

function StepContacts({
  data,
  onChange,
}: {
  data: BookingFormData;
  onChange: (d: BookingFormData) => void;
}) {
  const t = useT();
  const field = (
    id: keyof BookingFormData,
    label: string,
    type: string,
    placeholder: string,
    required = true
  ) => (
    <div className="space-y-2">
      <label htmlFor={`booking-${id}`} className="text-xs font-bold text-slate-600 uppercase tracking-wider">
        {label}
        {required && <span className="text-[#e5b9b9] ml-0.5">*</span>}
      </label>
      {id === 'comment' ? (
        <textarea
          id={`booking-${id}`}
          placeholder={placeholder}
          rows={3}
          value={data[id]}
          onChange={(e) => onChange({ ...data, [id]: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#e5b9b9] focus:ring-2 focus:ring-[#e5b9b9]/20 outline-none transition-all resize-none text-sm text-slate-800"
        />
      ) : (
        <input
          id={`booking-${id}`}
          type={type}
          placeholder={placeholder}
          required={required}
          value={data[id]}
          onChange={(e) => onChange({ ...data, [id]: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#e5b9b9] focus:ring-2 focus:ring-[#e5b9b9]/20 outline-none transition-all text-sm text-slate-800"
        />
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        {field('name', t('booking.yourName'), 'text', 'Anastasia')}
        {field('phone', t('booking.phone'), 'tel', '+371 2X XXX XXX')}
      </div>
      {field('email', t('booking.email'), 'email', 'example@mail.com')}
      {field('comment', t('booking.comment'), 'text', t('booking.commentPlaceholder'), false)}
      <p className="text-[11px] text-slate-400 leading-relaxed">
        {t('booking.privacyNotice')}{' '}
        <a href="/privacy-policy" className="underline hover:text-slate-600">
          {t('booking.privacyLink')}
        </a>
        .
      </p>
    </div>
  );
}

// ─── Step 4: Confirmation / Success ───────────────────────────────────────────

function StepConfirm({
  service,
  date,
  time,
  client,
  booking,
  loading,
  error,
  onSubmit,
}: {
  service: SelectedService;
  date: string;
  time: string;
  client: BookingFormData;
  booking: Booking | null;
  loading: boolean;
  error: string | null;
  onSubmit: () => void;
}) {
  const t = useT();
  const { lang } = useLang();
  const MONTHS_L = MONTHS[lang] || MONTHS.ru;
  const [copied, setCopied] = useState(false);

  const cancelUrl = booking
    ? `${window.location.origin}/booking/cancel?token=${booking.cancelToken}`
    : null;

  function copyLink() {
    if (!cancelUrl) return;
    navigator.clipboard.writeText(cancelUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const [, m, d] = date.split('-').map(Number);
  const dateLabel = `${d} ${MONTHS_L[m - 1]}`;

  if (booking) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6"
      >
        <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto">
          <CheckCircle2 className="text-green-500" size={32} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{t('booking.confirmed')}</h3>
          <p className="text-slate-500 text-sm">
            {t('booking.confirmedText')}
          </p>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5 text-left space-y-2 text-sm">
          <Row label={t('booking.procedure')} value={service.name} />
          <Row label={t('booking.date')} value={dateLabel} />
          <Row label={t('booking.time')} value={time} />
          <Row label={t('booking.name')} value={client.name} />
        </div>

        <div className="border border-dashed border-slate-200 rounded-2xl p-5 space-y-3">
          <p className="text-xs text-slate-500 font-medium">
            {t('booking.cancelLink')}
          </p>
          <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl p-3">
            <span className="text-xs text-slate-400 flex-1 truncate font-mono">
              {cancelUrl}
            </span>
            <button
              onClick={copyLink}
              aria-label="Copy link"
              className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            {t('booking.cancelLinkSent')}
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          {t('booking.backToHome')}
        </Link>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 rounded-2xl p-5 space-y-2 text-sm">
        <Row label={t('booking.procedure')} value={service.name} />
        <Row label={t('booking.duration')} value={service.duration} />
        {service.price && <Row label={t('booking.price')} value={service.price} />}
        <Row label={t('booking.date')} value={dateLabel} />
        <Row label={t('booking.time')} value={time} />
        <div className="border-t border-slate-200 pt-2 mt-2">
          <Row label={t('booking.name')} value={client.name} />
          <Row label={t('booking.phone')} value={client.phone} />
          {client.email && <Row label={t('booking.email')} value={client.email} />}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={loading}
        id="booking-submit"
        className="w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-3 bg-[#e5b9b9] hover:brightness-95 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#e5b9b9]/20"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            {t('booking.creating')}
          </>
        ) : (
          <>
            <Calendar size={18} />
            {t('booking.confirmBooking')}
          </>
        )}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className="text-slate-800 font-medium text-right">{value}</span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BookingPage() {
  const t = useT();
  const { lang } = useLang();
  const [step, setStep] = useState(0);
  const [service, setService] = useState<SelectedService | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    phone: '',
    email: '',
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Запись на процедуру | SKINLAB';
  }, []);

  function resetSlot() {
    setSelectedSlotId(null);
    setSelectedTime(null);
  }

  const handleDateChange = useCallback((date: string) => {
    setSelectedDate(date);
    resetSlot();
  }, []);

  const handleSlotSelect = useCallback((slotId: string, time: string) => {
    setSelectedSlotId(slotId);
    setSelectedTime(time);
  }, []);

  function canAdvance() {
    if (step === 0) return !!service;
    if (step === 1) return !!selectedSlotId;
    if (step === 2) return !!(formData.name && formData.phone);
    return false;
  }

  async function handleSubmit() {
    if (!service || !selectedSlotId || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const booking = await createBooking({
        slotId: selectedSlotId,
        date: selectedDate,
        time: selectedTime,
        service,
        client: formData,
      });
      setCreatedBooking(booking);
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : 'Произошла ошибка. Попробуйте ещё раз.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const stepContent = [
    <React.Fragment key="svc"><StepService selected={service} onSelect={(s) => setService(s)} /></React.Fragment>,
    <React.Fragment key="dt">
      <StepDateTime
        selectedDate={selectedDate}
        selectedSlotId={selectedSlotId}
        selectedTime={selectedTime}
        onDateChange={handleDateChange}
        onSlotSelect={handleSlotSelect}
        lang={lang}
      />
    </React.Fragment>,
    <React.Fragment key="ct"><StepContacts data={formData} onChange={setFormData} /></React.Fragment>,
    <React.Fragment key="cf">
      <StepConfirm
        service={service!}
        date={selectedDate!}
        time={selectedTime!}
        client={formData}
        booking={createdBooking}
        loading={submitting}
        error={submitError}
        onSubmit={handleSubmit}
      />
    </React.Fragment>,
  ];

  return (
    <div className="min-h-screen bg-[#fdfdfb] pt-28 pb-24 px-5 sm:px-10 lg:px-16">
      <div className="max-w-[700px] mx-auto">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-colors mb-10 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">{t('booking.back')}</span>
        </Link>

        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            {t('booking.title')}
          </h1>
          <p className="text-slate-400 text-sm">
            {t('booking.subtitle')}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-12">
          {[t('booking.step.procedure'), t('booking.step.datetime'), t('booking.step.contacts'), t('booking.step.confirm')].map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${done ? 'bg-[#e5b9b9] text-white' : active ? 'bg-[#e5b9b9] text-white ring-4 ring-[#e5b9b9]/20' : 'bg-slate-100 text-slate-400'}`}>
                    {done ? <Check size={14} /> : i + 1}
                  </div>
                  <span className={`text-[10px] font-semibold uppercase tracking-widest whitespace-nowrap hidden sm:block ${active ? 'text-slate-700' : done ? 'text-[#e5b9b9]' : 'text-slate-300'}`}>
                    {label}
                  </span>
                </div>
                {i < 3 && <div className={`flex-1 h-[2px] mx-2 transition-colors duration-500 ${done ? 'bg-[#e5b9b9]' : 'bg-slate-100'}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-[28px] border border-slate-100 shadow-sm shadow-slate-100 p-7 sm:p-10">
          {/* Section header */}
          {step < 3 && (
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-8 rounded-full bg-[#e5b9b9]/10 border border-[#e5b9b9]/30 flex items-center justify-center">
                {step === 0 && <Calendar size={15} className="text-[#e5b9b9]" />}
                {step === 1 && <Clock size={15} className="text-[#e5b9b9]" />}
                {step === 2 && <User size={15} className="text-[#e5b9b9]" />}
              </div>
              <h2 className="font-bold text-slate-900">
                {[t('booking.selectProcedure'), t('booking.dateTime'), t('booking.yourData')][step]}
              </h2>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              {stepContent[step]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        {step < 3 && !createdBooking && (
          <div className="flex items-center justify-between mt-6">
            {step > 0 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-700 transition-colors font-medium"
              >
                <ChevronLeft size={16} />
                {t('booking.back')}
              </button>
            ) : (
              <div />
            )}
            {step < 3 && (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance()}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all ${
                  canAdvance()
                    ? 'bg-[#e5b9b9] text-white hover:brightness-95 active:scale-[0.98] shadow-md shadow-[#e5b9b9]/20'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                {t('booking.next')}
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
