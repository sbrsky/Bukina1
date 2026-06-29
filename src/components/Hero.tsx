import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import * as LucideIcons from "lucide-react";

import { useContent } from "../hooks/useContent";
import { useServices } from "../hooks/useServices";
import { useCmsField, useT } from "../hooks/useT";

interface HeroCms {
  mainTitle?: string;
  [key: string]: any;
}

interface ServicesSectionCms {
  detailButtonText?: string;
  detailButtonText_lv?: string;
}

// ─── Fixed card dimensions ────────────────────────────────────────────────────
// Cards always have the same total height; content is clipped, not expanded.
const IMAGE_H = 220;   // px — image zone height
const CONTENT_H = 150; // px — text + CTA zone height
const TOTAL_H = IMAGE_H + CONTENT_H;

export default function Hero() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: heroCms, loading: heroLoading } = useContent<HeroCms>('content/hero');
  const { data: sectionCms } = useContent<ServicesSectionCms>('content/services_section');
  const { services, loading: servicesLoading } = useServices();
  const t = useT();
  const f = useCmsField();

  const detailBtnText = f(sectionCms, 'detailButtonText', t('hero.more'));

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    // Scroll by one full card width (first child width + gap)
    const card = el.firstElementChild as HTMLElement | null;
    const cardW = card ? card.offsetWidth + 20 : 300;
    el.scrollBy({ left: dir === 'left' ? -cardW : cardW, behavior: 'smooth' });
  };

  if (heroLoading || servicesLoading) {
    return (
      <section className="px-6 sm:px-12 lg:px-40 py-12 bg-white">
        <div className="max-w-[1200px] mx-auto space-y-6">
          <div className="h-10 w-56 bg-slate-100 rounded-xl animate-pulse" />
          <div className="flex gap-5 overflow-hidden">
            {[1, 2, 3].map(i => (
              <div key={i} className="shrink-0 w-[76vw] sm:w-[360px] rounded-[28px] bg-slate-50 animate-pulse" style={{ height: TOTAL_H }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ── Featured procedures shown in the Hero slider ──
  const slides: Array<{
    id: string;
    serviceId: string;
    title: string;
    description: string;
    image: string;
    iconName: string;
  }> = [
    {
      id: "plinest-pdrn",
      serviceId: "biostimulation",
      title: "ПДРН (Plinest)",
      description: "Революция в омоложении: глубокое восстановление структуры кожи и активация собственных ресурсов.",
      image: "https://picsum.photos/seed/plinest-pdrn/800/600",
      iconName: "Sparkles",
    },
    {
      id: "lip-biorevitalization",
      serviceId: "biorevitalization",
      title: "Биоревитализация губ",
      description: "Глубокое увлажнение и естественная сочность губ без лишнего объёма.",
      image: "https://picsum.photos/seed/lip-biorevit/800/600",
      iconName: "Droplets",
    },
    {
      id: "meso-xanthin",
      serviceId: "biostimulation",
      title: "Meso-Xanthin F199",
      description: "Глянцевое сияние и безупречный тон. Защита от фотостарения и стресса.",
      image: "https://picsum.photos/seed/meso-xanthin/800/600",
      iconName: "Sparkles",
    },
    {
      id: "anti-acne",
      serviceId: "skincare",
      title: "Anti Acne",
      description: "Авторская программа для проблемной кожи: чистота, здоровье и индивидуальный план.",
      image: "https://picsum.photos/seed/anti-acne/800/600",
      iconName: "Smile",
    },
    {
      id: "rrs-ha-eyes",
      serviceId: "mesotherapy",
      title: "RRS HA Eyes",
      description: "Коктейль для зоны вокруг глаз: уменьшает темные круги, отёки и мелкие морщинки.",
      image: "https://picsum.photos/seed/rrs-ha-eyes/800/600",
      iconName: "Syringe",
    },
    {
      id: "meso-eye-c71",
      serviceId: "mesotherapy",
      title: "Meso Eye C71",
      description: "Премиальный коктейль для периорбитальной зоны: дренаж, осветление и лифтинг взгляда.",
      image: "https://picsum.photos/seed/meso-eye-c71/800/600",
      iconName: "Syringe",
    },
  ];

  void services; // services still loaded for potential future linking

  return (
    <section className="px-6 sm:px-12 lg:px-40 py-12 bg-white">
      <div className="max-w-[1200px] mx-auto space-y-6">

        {/* ── Header row: title + desktop arrows ── */}
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 leading-tight">
            {f(heroCms, 'mainTitle', t('hero.title'))}
          </h2>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button onClick={() => scroll('left')} aria-label="Previous"
              className="w-11 h-11 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:text-primary hover:border-primary bg-white shadow-sm transition-all">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => scroll('right')} aria-label="Next"
              className="w-11 h-11 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:text-primary hover:border-primary bg-white shadow-sm transition-all">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* ── Slider track ── */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory"
          style={{ height: TOTAL_H }}
        >
          {slides.map((service, i) => {
            const Icon = (LucideIcons as any)[service.iconName || 'Sparkles'] || LucideIcons.Sparkles;
            return (
              <motion.article
                key={service.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.07, duration: 0.35 }}
                whileHover={{ y: -4 }}
                // Width: 76vw mobile (min 260, max 320), fixed 360px on sm+
                className="shrink-0 snap-start flex flex-col bg-white rounded-[28px] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all group overflow-hidden w-[76vw] min-w-[260px] max-w-[320px] sm:w-[360px] sm:max-w-[360px]"
                style={{ height: TOTAL_H }}
              >
                {/* ── Image zone — fixed height, image is absolutely positioned ── */}
                <div className="relative shrink-0 overflow-hidden" style={{ height: IMAGE_H }}>
                  {service.image ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url(${service.image})` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-primary/3 flex items-center justify-center">
                      <Icon size={56} className="text-primary/20" />
                    </div>
                  )}
                </div>

                {/* ── Content zone — fixed height, overflow clipped ── */}
                <div
                  className="flex flex-col justify-between px-5 py-4 overflow-hidden"
                  style={{ height: CONTENT_H }}
                >
                  {/* Text block */}
                  <div className="overflow-hidden space-y-1.5">
                    <h3
                      className="font-bold text-slate-900 text-base sm:text-lg leading-snug"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {f(service, 'title')}
                    </h3>
                    <p
                      className="text-slate-500 text-xs sm:text-sm leading-snug"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {f(service, 'description')}
                    </p>
                  </div>

                  {/* CTA — always at bottom */}
                  <Link
                    to={`/service/${service.id}`}
                    className="inline-flex items-center gap-1.5 text-primary font-bold text-sm group/link"
                  >
                    <span>{detailBtnText}</span>
                    <ArrowRight size={15} className="group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* ── Mobile arrows ── */}
        <div className="flex sm:hidden justify-center gap-3">
          <button onClick={() => scroll('left')} aria-label="Previous"
            className="w-11 h-11 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:text-primary hover:border-primary bg-white shadow-sm transition-all">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => scroll('right')} aria-label="Next"
            className="w-11 h-11 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:text-primary hover:border-primary bg-white shadow-sm transition-all">
            <ChevronRight size={20} />
          </button>
        </div>

      </div>
    </section>
  );
}
