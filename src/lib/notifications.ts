/**
 * Notifications — Telegram Bot + EmailJS
 * All serverless, no backend required.
 */
import emailjs from '@emailjs/browser';

export interface BookingData {
  name: string;
  phone: string;
  email: string;
  service: string;
  treatment: string;
  date: string;
  time: string;
  message?: string;
  bookingId: string;
}

// ─── Telegram ────────────────────────────────────────────────────────────────

export async function sendTelegramNotification(
  booking: BookingData,
  botToken: string,
  chatId: string
): Promise<void> {
  if (!botToken || !chatId) return;

  const text =
    `📅 *Новая запись!*\n\n` +
    `👤 *Имя:* ${booking.name}\n` +
    `📞 *Телефон:* ${booking.phone}\n` +
    `📧 *Email:* ${booking.email}\n\n` +
    `💆 *Услуга:* ${booking.service}\n` +
    `🔹 *Процедура:* ${booking.treatment}\n\n` +
    `📆 *Дата:* ${booking.date}\n` +
    `⏰ *Время:* ${booking.time}\n` +
    (booking.message ? `\n📝 *Комментарий:* ${booking.message}\n` : '') +
    `\n🆔 ID: \`${booking.bookingId}\``;

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    }),
  });
}

// ─── EmailJS ─────────────────────────────────────────────────────────────────

export async function sendEmailToOwner(booking: BookingData): Promise<void> {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_OWNER;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) return;

  await emailjs.send(
    serviceId,
    templateId,
    {
      booking_id: booking.bookingId,
      client_name: booking.name,
      client_phone: booking.phone,
      client_email: booking.email,
      service: booking.service,
      treatment: booking.treatment,
      date: booking.date,
      time: booking.time,
      message: booking.message || '—',
    },
    publicKey
  );
}

export async function sendEmailToClient(booking: BookingData): Promise<void> {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_CLIENT;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey || !booking.email) return;

  await emailjs.send(
    serviceId,
    templateId,
    {
      to_email: booking.email,
      to_name: booking.name,
      service: booking.service,
      treatment: booking.treatment,
      date: booking.date,
      time: booking.time,
    },
    publicKey
  );
}

// ─── All notifications at once ───────────────────────────────────────────────

export async function sendAllNotifications(
  booking: BookingData,
  settings: { telegramBotToken?: string; telegramChatId?: string }
): Promise<void> {
  await Promise.allSettled([
    sendTelegramNotification(
      booking,
      settings.telegramBotToken || '',
      settings.telegramChatId || ''
    ),
    sendEmailToOwner(booking),
    sendEmailToClient(booking),
  ]);
}
