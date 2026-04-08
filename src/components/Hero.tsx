import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";

const procedures = [
  {
    id: "biorevitalization",
    title: "Биоревитализация губ",
    treatment: "Биоревитализация губ",
    description: "Глубокое увлажнение и естественное омоложение нежной кожи губ без лишнего объема.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDAtp0tgmoq8H8VkoYpTfde-g2SiD2Hp4JAHF6x6EihDJs2sgiFP1jaaCfHzzLtQON3-e2gzyiePtFvMDTP9Z0_Z3mGXMTmCHqXMoxVHYAYqeW1cG2BgsXEBuZOTSU5fJ7MTAQlT_jpQC-U6caDWnwXdkpoH77LrSlo2UPo25H14wkWMhL0yRkFt7PWbaqznQBdPQtL74--8aMK_OD9hzfAoDGLfGSIbRObFIrpUw55S1tl7YqJFeUKCNaH-jWhCr5PRYLQ5A7nWk0",
  },
  {
    id: "biostimulation",
    title: "Лифтинг процедура",
    treatment: "RRS Long Lasting",
    description: "Эффективная подтяжка контура лица и восстановление упругости кожи.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC9E_7DtdQw87OXojMDqLev4StKkVBR3C9vXIzOowBhaM4kgFiVz5WwatGxLep9EU-XZyhBYuep-MpGSB8LBag5ElM8CPEP3jT4dgreMpg_zXvCp7GB-EjtCIoHsUoT95t0QsWpu2KASA7S-pBH1rt2bHu1kvCq-cC8hbQT8pCnayfgY9lKynkQjOk1ccXy_1wqnLuKIqbTOISKMTOV3piES_PVzZ86Gz0ekNZvGIkiI2qI5Vrovce7Lhzujpaj3scTDs_kg5l3vDk",
  },
  {
    id: "biostimulation",
    title: "Полинуклеотиды",
    treatment: "Plinest (ПДРН)",
    description: "Активация собственных ресурсов кожи для восстановления сияния и молодости.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA8lPW7kCyjP28pp6cZz7qGaarPSv65uWZxKcf5q5ffXo0_f3LxEqy_LlKczbB5uniXnnQqoi11Zw5XL-8EUZDm52AKlpFwZSn-4emzegH9REH1wxK0KkrpmDdJcgotUmLE_Yst0J6hXQd_spXLLhmyhEeBpuIHy2eCFoRhikCFAGTztObw_cPpCJRx_WwGvxSGeMjanZ8h5vAGMP1FEPGGwO7XfknCX2WjOahkaGmhE9vRHXciifrdJWUsHhK60aDH8fuAm7vn8n4",
  },
  {
    id: "skincare",
    title: "Anti Acne программа",
    treatment: "Anti Acne программа",
    description: "индивидуальные протоколы способны ввести в ремиссию самую проблемную кожу",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCutOcZcwT0JItrGo28bEgGPqRyJXE0waqPW9DxU3oef-dJYZFnBP95G364z_LYeFNEgtwITlKzCZcQIcVYCsCiOc3T7klNs8tu6D5fqLzQxx7wxk3WNqmsXqnEEgBBk2NPXuQvM0dlYk3jzj5WtM2NI508pVNn3GvjVyCeNp142E0oFQgbSV9WkJcO72ktFeRg89pljwIuBm0jH9CgohUzyDARpNqWchPXHpEBXTiZp9lsgGm08MgP8St2gyqu6m8hZaIbvDYxcfg",
  },
  {
    id: "mesotherapy",
    title: "Мезотерапия глаз",
    treatment: "RRS HA Eyes",
    description: "Прощайте, темные круги и отеки! Специальный коктейль для нежной кожи вокруг глаз.",
    image: "https://picsum.photos/seed/eye-meso/800/600",
  },
  {
    id: "biostimulation",
    title: "Meso Wharton",
    treatment: "Meso-Wharton P199",
    description: "Перезагрузка молодости. Активирует собственные стволовые клетки кожи, возвращая ей плотность.",
    image: "https://picsum.photos/seed/meso-wharton/800/600",
  },
];

export default function Hero() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <section className="px-6 sm:px-12 lg:px-40 py-12 bg-white">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-col gap-8 relative">
          <div className="flex items-end justify-between">
            <h2 className="text-4xl font-bold tracking-tight text-slate-900">
              Популярные процедуры
            </h2>
          </div>
          
          <div 
            ref={scrollRef}
            className="flex gap-8 overflow-x-auto pb-6 snap-x no-scrollbar scroll-smooth"
          >
            {procedures.map((proc, index) => (
              <motion.div
                key={`${proc.title}-${index}`}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex min-w-[300px] md:min-w-[380px] flex-col gap-6 rounded-[32px] bg-white p-4 sm:p-6 shadow-sm snap-start border border-slate-100 hover:shadow-xl transition-all group"
              >
                <div 
                  className="w-full aspect-[4/3] bg-center bg-no-repeat bg-cover rounded-[24px] overflow-hidden"
                  style={{ backgroundImage: `url(${proc.image})` }}
                >
                  <div className="w-full h-full bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
                <div className="flex flex-col px-2 pb-4 gap-3">
                  <h3 className="text-2xl font-bold text-slate-900 break-words">{proc.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 break-words">
                    {proc.description}
                  </p>
                  <Link 
                    to={`/service/${proc.id}${proc.treatment ? `?treatment=${encodeURIComponent(proc.treatment)}` : ""}`}
                    className="mt-4 inline-flex items-center gap-2 text-primary font-bold group/link"
                  >
                    <span>Подробнее</span>
                    <ArrowRight size={18} className="transform group-hover/link:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex justify-center lg:justify-end gap-3">
            <button 
              onClick={() => scroll('left')}
              className="w-12 h-12 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all bg-white shadow-sm"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={() => scroll('right')}
              className="w-12 h-12 flex items-center justify-center rounded-full border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all bg-white shadow-sm"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
