import { motion } from "motion/react";
import { useWorks } from "../hooks/useWorks";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLang } from "../context/LangContext";

export default function WorksPage() {
  const { works, loading } = useWorks();
  const { lang } = useLang();

  // Helper to fallback to Russian if target lang is missing
  const getField = (work: any, field: string) => {
    if (lang !== "ru") {
      const suffixed = `${field}_${lang}`;
      if (work[suffixed] !== undefined && work[suffixed] !== "") {
        return work[suffixed];
      }
    }
    return work[field] || "";
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-10 pb-24">
      <div className="max-w-3xl mx-auto px-6 sm:px-12">
        
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-primary transition-colors mb-6 text-sm font-medium">
            <ArrowLeft size={16} /> На главную
          </Link>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
            Наши работы
          </h1>
          <p className="text-slate-500 mt-4 text-lg">
            Результаты наших процедур. Мы ценим естественность и безопасность.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
        ) : works.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500">Портфолио пока пусто.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            {works.map((work, idx) => {
              const title = getField(work, "title");
              const desc = getField(work, "description");
              const tag = getField(work, "tag");

              return (
                <motion.div
                  key={work.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                >
                  {/* Card Container */}
                  <div className="bg-white rounded-[32px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col p-6 sm:p-10 gap-6">
                    
                    {/* Content Header */}
                    <div className="flex flex-col gap-3">
                      {tag && (
                        <span className="self-start px-3 py-1 bg-red-50 text-red-400 font-bold tracking-wider uppercase text-[10px] rounded-full border border-red-100/50">
                          {tag}
                        </span>
                      )}
                      
                      <h2 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                        {title}
                      </h2>
                      
                      {desc && (
                        <p className="text-slate-600 font-medium leading-relaxed mt-2 text-lg">
                          {desc}
                        </p>
                      )}
                    </div>

                    {/* Image */}
                    {work.image ? (
                      <div className="mt-4 overflow-hidden rounded-3xl aspect-[4/3] border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.06)]">
                         <img
                           src={work.image}
                           alt={title || "Наша работа"}
                           className="w-full h-full object-cover object-center"
                         />
                      </div>
                    ) : (
                      <div className="h-64 bg-slate-50 rounded-3xl flex items-center justify-center text-sm text-slate-400 border border-slate-100 border-dashed mt-4">
                        Изображение не загружено
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
