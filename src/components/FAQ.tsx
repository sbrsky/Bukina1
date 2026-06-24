import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useContent } from "../hooks/useContent";
import { useCmsField, useT } from "../hooks/useT";
import { useLang } from "../context/LangContext";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { data, loading } = useContent('content/faq');
  const t = useT();
  const f = useCmsField();
  const { lang } = useLang();

  if (loading) {
    return <div className="h-[400px] flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!data || !data.items || data.items.length === 0) return null;

  // Select language-specific item array.
  // Priority: items_[lang] array → items_lv (for lv) → items (RU default)
  function getItems(): any[] {
    const langKey = `items_${lang}`;
    if (lang !== 'ru' && data[langKey] && data[langKey].length > 0) {
      return data[langKey];
    }
    if (lang === 'lv' && data.items_lv && data.items_lv.length > 0) {
      return data.items_lv;
    }
    return data.items;
  }

  const items = getItems();

  return (
    <section id="faq" className="px-6 sm:px-12 lg:px-40 py-20 bg-slate-50">
      <div className="max-w-[800px] mx-auto">
        <h2 className="text-3xl font-bold tracking-tight mb-10 text-center text-slate-900">
          {f(data, 'mainTitle', t('faq.title'))}
        </h2>
        <div className="space-y-4">
          {items.map((faq: any, index: number) => (
            <div 
              key={index}
              className="bg-white rounded-xl border border-slate-100 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 cursor-pointer text-left"
              >
                <span className="text-lg font-bold text-slate-800">{faq.question}</span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="text-primary" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-6 text-slate-500 leading-relaxed border-t border-slate-50 pt-4 whitespace-pre-line">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
