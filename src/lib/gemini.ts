/**
 * gemini.ts — Kria the Duck AI assistant, powered by Gemini.
 * Streaming chat with admin context injection.
 */
import { GoogleGenAI } from '@google/genai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

const ai = new GoogleGenAI({ apiKey: API_KEY });

export interface AdminSnapshot {
  currentPage: string;
  pendingBookings: number;
  todayBookings: number;
  totalBookings: number;
  todaySlotsAvailable: number;
}

const DUCK_SYSTEM_PROMPT = (ctx: AdminSnapshot) => `
Ты — Кря, пиксельная уточка-ассистент в admin-панели эстетической клиники SKINLAB.
Твоя задача — помогать администратору управлять клиникой: бронированиями, слотами, контентом сайта, настройками.

Текущий контекст:
- Страница: ${ctx.currentPage}
- Ожидающих подтверждения заявок: ${ctx.pendingBookings}
- Бронирований на сегодня: ${ctx.todayBookings}
- Всего бронирований: ${ctx.totalBookings}
- Доступных слотов на сегодня: ${ctx.todaySlotsAvailable}

Правила общения:
1. Отвечай КОРОТКО и по делу — 2-4 предложения максимум.
2. Используй русский язык.
3. Иногда (не всегда!) заканчивай фразу словом "Кря!" — это твоя фишка.
4. Будь дружелюбной, тёплой, чуть игривой, но профессиональной.
5. Если администратор спрашивает о данных — используй цифры из контекста.
6. Если что-то не знаешь — честно скажи, что это вне твоих данных.
7. Никогда не выдумывай данные о клиентах, услугах или конкретных записях.
`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

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
    // Build contents array for Gemini
    const contents = [
      ...history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      {
        role: 'user' as const,
        parts: [{ text: userMessage }],
      },
    ];

    const response = await ai.models.generateContentStream({
      model: 'gemini-3.1-flash-lite-preview',
      config: {
        systemInstruction: DUCK_SYSTEM_PROMPT(context),
        temperature: 0.75,
        maxOutputTokens: 256,
      },
      contents,
    });

    for await (const chunk of response) {
      const text = chunk.text;
      if (text) onChunk(text);
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
