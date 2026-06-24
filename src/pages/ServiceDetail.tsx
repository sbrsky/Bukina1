import { useParams, Link, useLocation } from "react-router-dom";
import { useServices } from "../hooks/useServices";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Calendar, X, Info, Target, Activity, ImageIcon } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import * as LucideIcons from "lucide-react";
import { useT } from "../hooks/useT";
import { useLang } from "../context/LangContext";

interface Treatment {
  name: string;
  description: string;
  price: string;
  indications?: string[];
  results?: string[];
  detailedDescription?: string;
  image?: string;
  [key: string]: any; // allow _lang suffixed lookups
}

export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { search } = useLocation();
  const { services, loading } = useServices();
  const t = useT();
  const { lang } = useLang();
  const service = services.find((s) => s.id === id);
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);

  const queryParams = useMemo(() => new URLSearchParams(search), [search]);

  // Resolve a field from a service/treatment object respecting current language
  function fl(obj: any, field: string, fallback = ''): string {
    if (!obj) return fallback;
    if (lang !== 'ru') {
      const localized = obj[`${field}_${lang}`];
      if (localized) return localized;
    }
    return obj[field] ?? fallback;
  }

  useEffect(() => {
    if (service) {
      document.title = fl(service, 'seoTitle') || fl(service, 'title') + " | SKINLAB";
      
      const treatmentName = queryParams.get("treatment");
      if (treatmentName && service.treatments) {
        const treatment = service.treatments.find((t: any) => 
          t.name === treatmentName || fl(t, 'name') === treatmentName
        ) as Treatment | undefined;
        if (treatment) {
          setSelectedTreatment(treatment);
        }
      }
    }
    window.scrollTo(0, 0);
  }, [service, queryParams, lang]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfdfb]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfdfb]">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">{t('serviceDetail.notFound')}</h1>
          <Link to="/" className="text-primary hover:underline flex items-center justify-center gap-2">
            <ArrowLeft size={20} /> {t('serviceDetail.backHome')}
          </Link>
        </div>
      </div>
    );
  }

  const IconComp = (LucideIcons as any)[service.iconName || 'Sparkles'] || LucideIcons.Sparkles;
  const treatments = (service.treatments || []) as Treatment[];

  return (
    <div className="min-h-screen bg-[#fdfdfb] text-slate-900 selection:bg-primary/20">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 px-6 sm:px-12 lg:px-40 bg-white overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 -skew-x-12 translate-x-1/3 -z-10" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-[1200px] mx-auto relative z-10">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-colors mb-12 group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-bold uppercase tracking-widest">{t('serviceDetail.allServices')}</span>
          </Link>

          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-8 shadow-sm">
                <IconComp size={32} />
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] mb-8 text-slate-900">
                {fl(service, 'title')}
              </h1>
              <p className="text-xl text-slate-500 leading-relaxed mb-10 max-w-xl">
                {fl(service, 'description')}
              </p>
              <div className="flex flex-wrap gap-4">
                <a 
                  href="#booking"
                  className="inline-flex items-center gap-3 bg-slate-900 text-white px-10 py-5 rounded-full font-bold hover:bg-primary transition-all shadow-xl hover:shadow-primary/20"
                >
                  <Calendar size={20} />
                  {t('serviceDetail.viewPrices')}
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="aspect-[4/5] rounded-[32px] sm:rounded-[48px] overflow-hidden shadow-2xl border-8 border-white">
                <img 
                  src={service.image || `https://picsum.photos/seed/${service.id}/1000/1250`} 
                  alt={fl(service, 'title')}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-1000"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Treatments List */}
      <section className="py-20 lg:py-32 px-6 sm:px-12 lg:px-40" id="booking">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-20 text-center">
            <span className="text-primary font-bold uppercase tracking-[0.2em] text-xs mb-4 block">{t('serviceDetail.priceList')}</span>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">{t('serviceDetail.proceduresAndPrices')}</h2>
            <div className="w-24 h-1 bg-primary mx-auto rounded-full" />
          </div>

          <div className="grid gap-8">
            {treatments.map((treatment, index) => (
              <motion.div
                key={treatment.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group bg-white p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-8"
              >
                <div className="flex-1">
                  <h3 className="text-xl lg:text-2xl font-bold mb-3 group-hover:text-primary transition-colors break-words">
                    {fl(treatment, 'name')}
                  </h3>
                  <p className="text-slate-500 text-lg leading-relaxed max-w-2xl mb-4">
                    {fl(treatment, 'description')}
                  </p>
                  <button
                    onClick={() => setSelectedTreatment(treatment)}
                    className="text-primary text-sm font-bold flex items-center gap-2 hover:gap-3 transition-all group/btn"
                  >
                    <Info size={16} />
                    {t('serviceDetail.details')}
                  </button>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-8 lg:gap-12">
                  <div className="text-center sm:text-right">
                    <span className="text-xs text-slate-400 uppercase tracking-[0.2em] block mb-2">{t('serviceDetail.price')}</span>
                    <span className="text-xl font-bold text-slate-900">{treatment.price}</span>
                  </div>
                  
                  <Link 
                    to="/booking"
                    className="w-full sm:w-auto bg-primary text-white px-8 py-4 rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg hover:shadow-primary/20 text-center text-sm"
                  >
                    {t('serviceDetail.book')}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Treatment Detail Modal */}
      <AnimatePresence>
        {selectedTreatment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTreatment(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] sm:rounded-[48px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-8 sm:p-12 pb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                    {fl(selectedTreatment, 'name')}
                  </h3>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-bold">
                    {selectedTreatment.price}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedTreatment(null)}
                  className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="px-8 sm:p-12 pt-4 overflow-y-auto custom-scrollbar pb-12">
                <div className="space-y-10">
                  {/* Detailed Description */}
                  {fl(selectedTreatment, 'detailedDescription') && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                        <Info size={14} className="text-primary" />
                        {t('serviceDetail.about')}
                      </h4>
                      <p className="text-slate-600 leading-relaxed text-lg">
                        {fl(selectedTreatment, 'detailedDescription')}
                      </p>
                    </div>
                  )}

                  {/* Indications */}
                  {selectedTreatment.indications && selectedTreatment.indications.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                        <Target size={14} className="text-primary" />
                        {t('serviceDetail.indications')}
                      </h4>
                      <ul className="grid sm:grid-cols-2 gap-3">
                        {selectedTreatment.indications.map((item, i) => (
                          <li key={i} className="flex items-center gap-3 text-slate-600 bg-slate-50 p-3 rounded-2xl text-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Results */}
                  {selectedTreatment.results && selectedTreatment.results.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                        <Activity size={14} className="text-primary" />
                        {t('serviceDetail.results')}
                      </h4>
                      <ul className="grid sm:grid-cols-2 gap-3">
                        {selectedTreatment.results.map((item, i) => (
                          <li key={i} className="flex items-center gap-3 text-slate-600 bg-primary/5 p-3 rounded-2xl text-sm border border-primary/10">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Photo */}
                  {selectedTreatment.image && (
                    <div>
                      <div className="aspect-[4/3] sm:aspect-video rounded-3xl overflow-hidden border border-slate-100 shadow-[0_12px_40px_rgba(0,0,0,0.06)] mt-8">
                         <img
                           src={selectedTreatment.image}
                           alt={fl(selectedTreatment, 'name')}
                           className="w-full h-full object-cover object-center"
                           referrerPolicy="no-referrer"
                         />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-12">
                  <Link 
                    to="/booking"
                    onClick={() => setSelectedTreatment(null)}
                    className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold hover:bg-primary transition-all shadow-xl flex items-center justify-center gap-3"
                  >
                    <Calendar size={20} />
                    {t('serviceDetail.bookProcedure')}
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
