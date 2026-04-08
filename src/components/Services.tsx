import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { servicesData } from "../data/servicesData";
import { ArrowRight } from "lucide-react";

export default function Services() {
  return (
    <section id="services" className="py-24 px-6 sm:px-12 lg:px-40 bg-[#fdfdfb]">
      <div className="max-w-[1200px] mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 flex flex-col lg:flex-row items-center lg:items-end justify-between gap-8"
        >
          <div className="text-center lg:text-left max-w-2xl">
            <span className="text-primary font-bold uppercase tracking-widest text-sm mb-4 block">Наши услуги</span>
            <h2 className="text-4xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6">
              Эстетическая косметология
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed">
              Профессиональные решения для вашей кожи: от глубокого очищения до инновационных инъекционных методик омоложения.
            </p>
          </div>
          
          <div className="hidden lg:block w-64 h-32 rounded-[32px] overflow-hidden shadow-xl border-4 border-white rotate-3 hover:rotate-0 transition-transform duration-500">
            <img 
              src="https://picsum.photos/seed/skincare-accent/400/200" 
              alt="Skincare" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {servicesData.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative flex flex-col gap-6 rounded-[32px] bg-white overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all h-full"
              >
                {/* Image Header */}
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={service.image} 
                    alt={service.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                  <div className="absolute bottom-4 left-6 w-12 h-12 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center text-primary shadow-lg">
                    <Icon size={24} />
                  </div>
                </div>
                
                <div className="px-6 sm:px-8 pb-8 flex-1 flex flex-col">
                  <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-primary transition-colors break-words">
                    {service.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6 break-words flex-1">
                    {service.description}
                  </p>

                  <Link 
                    to={`/service/${service.id}`}
                    className="mt-auto inline-flex items-center justify-between w-full group/btn"
                  >
                    <span className="text-sm font-bold text-slate-900 group-hover/btn:text-primary transition-colors">
                      Узнать больше
                    </span>
                    <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center group-hover/btn:bg-primary group-hover/btn:text-white group-hover/btn:border-primary transition-all">
                      <ArrowRight size={18} className="transform group-hover/btn:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <Link 
            to="/services"
            className="inline-flex items-center gap-3 px-10 py-5 bg-slate-900 text-white font-bold rounded-2xl hover:bg-primary transition-all shadow-xl shadow-slate-200 hover:shadow-primary/20 group"
          >
            <span>Посмотреть все услуги</span>
            <ArrowRight size={20} className="transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
