/**
 * gemini.ts — Kria the Duck AI assistant.
 * Streaming chat via Lovable Cloud edge function (key stays server-side).
 */
import { supabase } from '@/integrations/supabase/client';

export interface AdminSnapshot {
  currentPage: string;
  pendingBookings: number;
  todayBookings: number;
  totalBookings: number;
  todaySlotsAvailable: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/duck-chat`;

/**
 * Send a message and get a streaming response.
 * Calls onChunk with each text chunk as it arrives.
 */
export async function sendDuckMessage(
  history: ChatMessage[],
  userMessage: string,
  context: AdminSnapshot,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const resp = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ history, userMessage, context }),
    });

    if (!resp.ok || !resp.body) {
      if (resp.status === 429) return onError('Кря! Слишком много запросов. Подожди немного.');
      if (resp.status === 402) return onError('Кря! Закончились кредиты на ИИ. Пополни баланс в настройках.');
      return onError('Кря! Что-то пошло не так. Попробуй ещё раз.');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          const text = json.choices?.[0]?.delta?.content;
          if (text) onChunk(text);
        } catch {
          /* ignore parse errors on keep-alive chunks */
        }
      }
    }

    onDone();
  } catch (err) {
    console.error('[DuckAI]', err);
    onError('Кря! Что-то пошло не так. Попробуй ещё раз.');
  }
}

/** Quick suggestions shown as chip buttons in chat */
export const QUICK_PROMPTS = [
  'Сколько новых заявок?',
  'Что сделать сегодня?',
  'Какие слоты свободны?',
  'Помоги с текстом для акции',
  'Советы по дашборду',
];
