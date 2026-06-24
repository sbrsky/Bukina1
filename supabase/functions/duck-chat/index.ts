// Duck (Kria) AI proxy — streams Gemini through Lovable AI Gateway.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface AdminSnapshot {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { history, userMessage, context } = await req.json();

    const messages = [
      { role: "system", content: DUCK_SYSTEM_PROMPT(context) },
      ...(history ?? []).map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ];

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        temperature: 0.75,
        max_tokens: 256,
        messages,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      const status = upstream.status === 429 || upstream.status === 402 ? upstream.status : 500;
      return new Response(JSON.stringify({ error: text || "Upstream error" }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[duck-chat]", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
