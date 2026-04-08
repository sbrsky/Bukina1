import { motion, AnimatePresence } from "motion/react";
import { Calendar as CalendarIcon, Clock, User, Phone, Mail, MessageSquare, CheckCircle2, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import React, { useState, useEffect } from "react";

const services = [
  { id: "cleansing", name: "Чистка лица", duration: "90 мин", price: "60 €" },
  { id: "peel", name: "Химический пилинг", duration: "45 мин", price: "45 €" },
  { id: "meso", name: "Мезотерапия", duration: "60 мин", price: "80 €" },
  { id: "consult", name: "Консультация", duration: "30 мин", price: "20 €" },
];

const timeSlots = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00"];

export default function BookingPage() {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number>(9);
  const [selectedTime, setSelectedTime] = useState<string | null>("12:00");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    comment: ""
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Запись на процедуру | SKINLAB";
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedService && selectedTime) {
      setIsSubmitted(true);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfdfb] pt-24 pb-20 px-6 sm:px-12 lg:px-40">
      <div className="max-w-[800px] mx-auto">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-colors mb-12 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">Назад</span>
        </Link>

        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">Запись на процедуру</h1>
          <p className="text-slate-500">
            Выберите подходящее время для вашего преображения в SKINLAB.<br />
            Профессиональная забота о вашей коже.
          </p>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-8 sm:p-12 space-y-16">
          {/* Step 1: Select Service */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-8 h-8 rounded-full bg-[#e5b9b9] text-white flex items-center justify-center font-bold text-sm">1</div>
              <h2 className="text-xl font-bold text-slate-900">Выберите услугу</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`p-6 rounded-2xl border text-left transition-all relative overflow-hidden ${
                    selectedService === service.id 
                      ? "border-[#e5b9b9] bg-[#e5b9b9]/5" 
                      : "border-slate-100 hover:border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col gap-1 relative z-10">
                    <span className={`font-bold transition-colors ${selectedService === service.id ? "text-slate-900" : "text-slate-900"}`}>
                      <span className={selectedService === service.id ? "bg-[#e5b9b9]/30 px-1 -mx-1 rounded" : ""}>
                        {service.name}
                      </span>
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {service.duration} • {service.price}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Step 2: Date and Time */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-8 h-8 rounded-full bg-[#e5b9b9] text-white flex items-center justify-center font-bold text-sm">2</div>
              <h2 className="text-xl font-bold text-slate-900">Дата и время</h2>
            </div>
            <div className="grid lg:grid-cols-[1fr_1fr] gap-8">
              {/* Simple Calendar UI */}
              <div className="border border-slate-100 rounded-2xl p-6 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-900 relative inline-block">
                    Октябрь 2023
                    <div className="absolute -bottom-1 left-0 w-full h-1 bg-[#e5b9b9]/40 rounded-full" />
                  </h3>
                  <div className="flex gap-1">
                    <button className="p-1 text-slate-400 hover:text-slate-900"><ChevronLeft size={18} /></button>
                    <button className="p-1 text-slate-400 hover:text-slate-900"><ChevronRight size={18} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                  <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const isSelected = selectedDate === day;
                    const isPast = day < 9;
                    const isToday = day === 9;
                    const isWeekend = (day + 5) % 7 === 0 || (day + 5) % 7 === 6;
                    return (
                      <button
                        key={day}
                        onClick={() => !isPast && setSelectedDate(day)}
                        className={`h-9 w-full rounded-lg flex items-center justify-center text-xs transition-all ${
                          isSelected 
                            ? "bg-[#e5b9b9] text-white font-bold" 
                            : isPast 
                              ? "text-slate-200 cursor-not-allowed" 
                              : isWeekend
                                ? "text-[#a5b4fc] hover:bg-slate-50"
                                : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div className="grid grid-cols-3 gap-3">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`p-3 rounded-xl border text-xs font-medium transition-all flex items-center justify-center ${
                      selectedTime === time 
                        ? "bg-[#e5b9b9] text-white border-[#e5b9b9] shadow-sm" 
                        : "border-slate-100 hover:border-slate-200 text-slate-600 bg-white"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Step 3: Contact Details */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-8 h-8 rounded-full bg-[#e5b9b9] text-white flex items-center justify-center font-bold text-sm">3</div>
              <h2 className="text-xl font-bold text-slate-900">Контактные данные</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Ваше имя</label>
                  <input 
                    type="text" 
                    placeholder="Введите имя"
                    required
                    className="w-full p-4 rounded-xl border border-slate-200 focus:border-[#e5b9b9] focus:ring-1 focus:ring-[#e5b9b9] outline-none transition-all text-sm"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Номер телефона</label>
                  <input 
                    type="tel" 
                    placeholder="+371 ________"
                    required
                    className="w-full p-4 rounded-xl border border-slate-200 focus:border-[#e5b9b9] focus:ring-1 focus:ring-[#e5b9b9] outline-none transition-all text-sm"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email</label>
                <input 
                  type="email" 
                  placeholder="example@mail.com"
                  required
                  className="w-full p-4 rounded-xl border border-slate-200 focus:border-[#e5b9b9] focus:ring-1 focus:ring-[#e5b9b9] outline-none transition-all text-sm"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Комментарий к записи</label>
                <textarea 
                  placeholder="Опишите ваши пожелания или особенности кожи..."
                  rows={4}
                  className="w-full p-4 rounded-xl border border-slate-200 focus:border-[#e5b9b9] focus:ring-1 focus:ring-[#e5b9b9] outline-none transition-all resize-none text-sm"
                  value={formData.comment}
                  onChange={(e) => setFormData({...formData, comment: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                disabled={!selectedService || !selectedTime}
                className={`w-full py-5 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-3 ${
                  selectedService && selectedTime 
                    ? "bg-[#e5b9b9] hover:brightness-95 active:scale-[0.98]" 
                    : "bg-slate-200 cursor-not-allowed"
                }`}
              >
                <CalendarIcon size={20} />
                Записаться
              </button>
              <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest">
                Нажимая кнопку, вы соглашаетесь с правилами обработки персональных данных
              </p>
            </form>
          </section>
        </div>

        <AnimatePresence>
          {isSubmitted && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-6 bg-[#f0fdf4] border border-[#dcfce7] rounded-2xl flex items-start gap-4"
            >
              <CheckCircle2 className="text-[#22c55e] shrink-0" size={24} />
              <div>
                <h4 className="font-bold text-[#166534] mb-1">Спасибо! Ваша запись принята.</h4>
                <p className="text-sm text-[#15803d]">
                  Мы отправили подтверждение на вашу почту. Если у вас возникнут вопросы, мы свяжемся с вами по телефону.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
