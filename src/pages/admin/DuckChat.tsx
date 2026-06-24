/**
 * DuckChat.tsx — Full-featured AI chat panel for the duck assistant.
 * Features: streaming Gemini responses, quick prompts, message history.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Sparkles, RefreshCw } from 'lucide-react';
import { sendDuckMessage, QUICK_PROMPTS } from '../../lib/gemini';
import type { ChatMessage, AdminSnapshot } from '../../lib/gemini';

interface DuckChatProps {
  context: AdminSnapshot;
  onClose: () => void;
}

const GREETING = `Привет! Я Кря — твой пиксельный помощник 🦆\nСпрашивай про заявки, слоты, или просто поболтаем. Кря!`;

export default function DuckChat({ context, onClose }: DuckChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      const userMsg: ChatMessage = { role: 'user', content: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsLoading(true);
      setStreamingText('');

      let accumulated = '';

      await sendDuckMessage(
        messages,
        text.trim(),
        context,
        (chunk) => {
          accumulated += chunk;
          setStreamingText(accumulated);
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        },
        () => {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: accumulated },
          ]);
          setStreamingText('');
          setIsLoading(false);
        },
        (errMsg) => {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: errMsg },
          ]);
          setStreamingText('');
          setIsLoading(false);
        }
      );
    },
    [messages, context, isLoading]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: GREETING }]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="flex flex-col bg-slate-900 border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
      style={{ width: 320, height: 460 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/[0.06] bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
        <div className="relative">
          <div className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-base">
            🦆
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-900" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-semibold leading-none">Кря</div>
          <div className="text-slate-500 text-[10px] mt-0.5">AI-ассистент • {context.currentPage}</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all"
            title="Очистить чат"
          >
            <RefreshCw size={13} />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Context pills */}
      {(context.pendingBookings > 0 || context.todaySlotsAvailable > 0) && (
        <div className="flex gap-1.5 px-3 py-2 flex-wrap border-b border-white/[0.04] flex-shrink-0">
          {context.pendingBookings > 0 && (
            <span className="text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5">
              ⏳ {context.pendingBookings} ждут подтв.
            </span>
          )}
          {context.todaySlotsAvailable > 0 && (
            <span className="text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5">
              📅 {context.todaySlotsAvailable} слотов сегодня
            </span>
          )}
          {context.todayBookings > 0 && (
            <span className="text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-full px-2 py-0.5">
              📋 {context.todayBookings} сегодня
            </span>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-lg bg-amber-400/20 border border-amber-400/25 flex items-center justify-center text-xs mr-1.5 mt-0.5 flex-shrink-0">
                  🦆
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary/90 text-white rounded-br-sm'
                    : 'bg-slate-800 text-slate-200 rounded-bl-sm border border-white/[0.05]'
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}

          {/* Streaming bubble */}
          {streamingText && (
            <motion.div
              key="streaming"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-400/20 border border-amber-400/25 flex items-center justify-center text-xs mr-1.5 mt-0.5 flex-shrink-0">
                🦆
              </div>
              <div className="max-w-[78%] rounded-2xl rounded-bl-sm px-3 py-2 text-[13px] leading-relaxed bg-slate-800 text-slate-200 border border-white/[0.05] whitespace-pre-wrap">
                {streamingText}
                <span className="inline-block w-1.5 h-3.5 bg-amber-400 ml-0.5 animate-pulse rounded-sm align-middle" />
              </div>
            </motion.div>
          )}

          {/* Loading dots */}
          {isLoading && !streamingText && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-400/20 border border-amber-400/25 flex items-center justify-center text-xs mr-1.5 mt-0.5 flex-shrink-0">
                🦆
              </div>
              <div className="bg-slate-800 border border-white/[0.05] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                {[0, 0.15, 0.3].map((delay, di) => (
                  <motion.span
                    key={di}
                    className="w-1.5 h-1.5 rounded-full bg-amber-400"
                    animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div className="px-3 pb-1 flex gap-1.5 overflow-x-auto scrollbar-none flex-shrink-0">
          {QUICK_PROMPTS.slice(0, 4).map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              disabled={isLoading}
              className="flex-shrink-0 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/[0.07] rounded-xl px-2.5 py-1.5 transition-all disabled:opacity-40"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 pt-2 flex-shrink-0">
        <div className="flex gap-2 items-end bg-slate-800 border border-white/[0.08] rounded-xl px-3 py-2 focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(var(--color-primary)/0.1)] transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Спроси уточку…"
            disabled={isLoading}
            rows={1}
            className="flex-1 bg-transparent text-[13px] text-white placeholder-slate-500 resize-none outline-none leading-relaxed disabled:opacity-50"
            style={{ maxHeight: 80 }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary text-white disabled:opacity-30 hover:bg-primary/80 transition-all flex-shrink-0"
          >
            {isLoading ? (
              <Sparkles size={14} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5 text-center">
          Enter — отправить · Shift+Enter — новая строка
        </p>
      </div>
    </motion.div>
  );
}
