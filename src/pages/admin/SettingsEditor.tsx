import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { loadGoogleApis, authorizeCalendar, isAuthorized } from '../../lib/calendar';
import { motion } from 'motion/react';
import { Save, Calendar, Bot, Mail, Phone, MapPin, Instagram, Send, Check, ExternalLink, Globe } from 'lucide-react';

interface SiteSettings {
  phone: string;
  email: string;
  address: string;
  socialLinks: { instagram?: string; telegram?: string };
  telegramBotToken: string;
  telegramChatId: string;
  googleCalendarId: string;
  enabledLanguages: string[];
}

const ALL_LANGUAGES = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺', hint: 'Основной язык' },
  { code: 'en', label: 'English', flag: '🇬🇧', hint: 'Английский' },
  { code: 'lv', label: 'Latviešu', flag: '🇱🇻', hint: 'Латышский' },
  { code: 'uk', label: 'Українська', flag: '🇺🇦', hint: 'Украинский' },
  { code: 'lt', label: 'Lietuvių', flag: '🇱🇹', hint: 'Литовский' },
  { code: 'et', label: 'Eesti', flag: '🇪🇪', hint: 'Эстонский' },
  { code: 'es', label: 'Español', flag: '🇪🇸', hint: 'Испанский' },
] as const;


const inputClass = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 transition-all text-sm';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</label>
        {hint && <p className="text-slate-600 text-xs mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          {icon}
        </div>
        <h2 className="text-white font-semibold text-sm">{title}</h2>
      </div>
      <div className="flex flex-col gap-5">{children}</div>
    </div>
  );
}

export default function SettingsEditor() {
  const [settings, setSettings] = useState<SiteSettings>({
    phone: '',
    email: '',
    address: '',
    socialLinks: {},
    telegramBotToken: '',
    telegramChatId: '',
    googleCalendarId: 'primary',
    enabledLanguages: ['ru', 'en', 'lv'],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [telegramTesting, setTelegramTesting] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const snap = await getDoc(doc(db, 'settings', 'site'));
      if (snap.exists()) setSettings(snap.data() as SiteSettings);
    } catch {}
    setLoading(false);
    setCalendarConnected(isAuthorized());
  }

  async function save() {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'site'), settings);
      setSaveMsg('Сохранено ✓');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e: any) {
      setSaveMsg(`Ошибка: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function connectCalendar() {
    try {
      await loadGoogleApis();
      await authorizeCalendar();
      setCalendarConnected(true);
      setSaveMsg('Google Calendar подключён ✓');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e: any) {
      setSaveMsg(`Ошибка: ${e.message}`);
    }
  }

  async function testTelegram() {
    const { telegramBotToken, telegramChatId } = settings;
    if (!telegramBotToken || !telegramChatId) {
      setTelegramTestResult('❌ Заполните Token и Chat ID');
      return;
    }
    setTelegramTesting(true);
    setTelegramTestResult('');
    try {
      const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: '✅ *SKINLAB Admin* — Telegram бот подключён и работает!',
          parse_mode: 'Markdown',
        }),
      });
      const data = await response.json();
      if (data.ok) {
        setTelegramTestResult('✅ Сообщение отправлено! Проверьте Telegram.');
      } else {
        setTelegramTestResult(`❌ Ошибка: ${data.description}`);
      }
    } catch (e: any) {
      setTelegramTestResult(`❌ ${e.message}`);
    } finally {
      setTelegramTesting(false);
    }
  }

  const upd = (field: keyof SiteSettings, value: any) =>
    setSettings((s) => ({ ...s, [field]: value }));

  const updSocial = (key: string, value: string) =>
    setSettings((s) => ({ ...s, socialLinks: { ...s.socialLinks, [key]: value } }));

  const toggleLanguage = (code: string) => {
    setSettings((s) => {
      const enabled = s.enabledLanguages ?? ['ru', 'en', 'lv'];
      // Always keep at least one language enabled
      if (enabled.includes(code) && enabled.length <= 1) return s;
      const next = enabled.includes(code)
        ? enabled.filter((c) => c !== code)
        : [...enabled, code];
      return { ...s, enabledLanguages: next };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Настройки</h1>
          <p className="text-slate-400 text-sm mt-1">Контакты, мессенджеры, интеграции</p>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && <span className="text-green-400 text-sm">{saveMsg}</span>}
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:brightness-110 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? 'Сохраняем...' : 'Сохранить'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5">

        {/* Contacts */}
        <Section icon={<Phone size={16} />} title="Контактная информация">
          <Field label="Телефон">
            <input className={inputClass} placeholder="+371 00 000 000" value={settings.phone} onChange={(e) => upd('phone', e.target.value)} />
          </Field>
          <Field label="Email">
            <input className={inputClass} placeholder="info@skinlab.lv" value={settings.email} onChange={(e) => upd('email', e.target.value)} />
          </Field>
          <Field label="Адрес">
            <input className={inputClass} placeholder="Рига, Латвия" value={settings.address} onChange={(e) => upd('address', e.target.value)} />
          </Field>
        </Section>

        {/* Social */}
        <Section icon={<Instagram size={16} />} title="Социальные сети">
          <Field label="Instagram URL">
            <input className={inputClass} placeholder="https://instagram.com/skinlab" value={settings.socialLinks?.instagram || ''} onChange={(e) => updSocial('instagram', e.target.value)} />
          </Field>
          <Field label="Telegram канал / профиль URL">
            <input className={inputClass} placeholder="https://t.me/skinlab" value={settings.socialLinks?.telegram || ''} onChange={(e) => updSocial('telegram', e.target.value)} />
          </Field>
        </Section>

        {/* Telegram Bot */}
        <Section icon={<Bot size={16} />} title="Telegram Bot уведомления">
          <Field
            label="Bot Token"
            hint="Получить у @BotFather → /newbot → скопировать токен"
          >
            <input
              className={inputClass}
              type="password"
              placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
              value={settings.telegramBotToken}
              onChange={(e) => upd('telegramBotToken', e.target.value)}
            />
          </Field>
          <Field
            label="Chat ID"
            hint="Напишите боту, затем откройте: api.telegram.org/bot{TOKEN}/getUpdates → найдите message.chat.id"
          >
            <input
              className={inputClass}
              placeholder="-123456789"
              value={settings.telegramChatId}
              onChange={(e) => upd('telegramChatId', e.target.value)}
            />
          </Field>
          <div className="flex items-center gap-3">
            <button
              onClick={testTelegram}
              disabled={telegramTesting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 hover:bg-sky-500/20 text-sm transition-all disabled:opacity-50"
            >
              <Send size={14} />
              {telegramTesting ? 'Отправляем...' : 'Тест отправки'}
            </button>
            {telegramTestResult && <span className="text-xs text-slate-300">{telegramTestResult}</span>}
          </div>
        </Section>

        {/* Languages */}
        <Section icon={<Globe size={16} />} title="Языки сайта">
          <p className="text-slate-500 text-xs -mt-2">
            Выбранные языки отображаются в переключателе на сайте. Минимум один.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ALL_LANGUAGES.map((lang) => {
              const enabled = (settings.enabledLanguages ?? ['ru', 'en', 'lv']).includes(lang.code);
              const isOnly = (settings.enabledLanguages ?? []).length === 1 && enabled;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => toggleLanguage(lang.code)}
                  disabled={isOnly}
                  title={isOnly ? 'Нельзя отключить последний язык' : undefined}
                  className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                    enabled
                      ? 'bg-primary/12 border-primary/35 text-white'
                      : 'bg-white/3 border-white/8 text-slate-500 hover:border-white/20 hover:text-slate-300'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <span className="text-xl leading-none">{lang.flag}</span>
                  <div className="text-left">
                    <div className="text-xs font-semibold">{lang.label}</div>
                    <div className="text-[10px] text-slate-500">{lang.hint}</div>
                  </div>
                  {enabled && (
                    <div className="ml-auto w-4 h-4 rounded-full bg-primary/80 flex items-center justify-center flex-shrink-0">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Google Calendar */}
        <Section icon={<Calendar size={16} />} title="Google Calendar">
          <Field
            label="Calendar ID"
            hint='Настройки Google Calendar → ID конкретного календаря (или оставьте "primary")'
          >
            <input
              className={inputClass}
              placeholder="primary"
              value={settings.googleCalendarId}
              onChange={(e) => upd('googleCalendarId', e.target.value)}
            />
          </Field>

          <div className="flex items-center gap-3">
            {calendarConnected ? (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Check size={16} />
                Google Calendar подключён
              </div>
            ) : (
              <button
                onClick={connectCalendar}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 text-sm transition-all"
              >
                <Calendar size={14} />
                Подключить Google Calendar
              </button>
            )}
            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs transition-colors"
            >
              Открыть Calendar <ExternalLink size={11} />
            </a>
          </div>

          <p className="text-slate-600 text-xs">
            Требуется VITE_GOOGLE_CLIENT_ID и VITE_GOOGLE_CALENDAR_API_KEY в .env.local.
            При бронировании новые записи автоматически добавляются в ваш календарь.
          </p>
        </Section>

      </div>
    </div>
  );
}
