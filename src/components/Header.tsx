import { motion } from "motion/react";
import { Menu, X, PlusSquare, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { servicesData } from "../data/servicesData";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavClick = (e: any, href: string) => {
    if (href.startsWith("#")) {
      if (location.pathname !== "/") {
        e.preventDefault();
        navigate("/" + href);
      }
    }
    setIsMenuOpen(false);
  };

  const navLinks = [
    { name: "Главная", href: "/" },
    { name: "Обучение", href: "/training" },
    { name: "Магазин", href: "/shop" },
    { name: "Услуги", href: "/services", hasDropdown: true },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-white/80 backdrop-blur-xl px-6 sm:px-12 lg:px-40 py-4">
      <div className="flex items-center justify-between max-w-[1200px] mx-auto">
        <Link to="/" className="flex items-center gap-3 text-primary group">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
            <PlusSquare size={24} />
          </div>
          <h1 className="text-slate-900 text-xl font-bold leading-tight tracking-tight">
            SKINLAB
          </h1>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-10">
          {navLinks.map((link) => (
            <div 
              key={link.name} 
              className="relative group/nav"
              onMouseEnter={() => link.hasDropdown && setIsServicesOpen(true)}
              onMouseLeave={() => link.hasDropdown && setIsServicesOpen(false)}
            >
              <div className="flex items-center gap-1">
                {link.href.startsWith("/") ? (
                  <Link
                    to={link.href}
                    className="text-slate-600 text-sm font-bold hover:text-primary transition-colors"
                  >
                    {link.name}
                  </Link>
                ) : (
                  <a
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="text-slate-600 text-sm font-bold hover:text-primary transition-colors"
                  >
                    {link.name}
                  </a>
                )}
                {link.hasDropdown && (
                  <div className="text-slate-400 group-hover/nav:text-primary transition-colors">
                    <ChevronDown size={14} />
                  </div>
                )}
              </div>

              {link.hasDropdown && (
                <div 
                  className={`absolute top-full left-1/2 -translate-x-1/2 pt-4 transition-all duration-300 ${isServicesOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}
                >
                  <div className="bg-white border border-slate-100 shadow-2xl rounded-2xl p-4 min-w-[240px] grid gap-2">
                    {servicesData.map((s) => (
                      <Link
                        key={s.id}
                        to={`/service/${s.id}`}
                        onClick={() => setIsServicesOpen(false)}
                        className="text-sm text-slate-600 hover:text-primary hover:bg-primary/5 p-2 rounded-lg transition-all flex items-center gap-3"
                      >
                        <s.icon size={16} className="text-primary/60" />
                        <span>{s.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link 
            to="/booking"
            onClick={() => setIsMenuOpen(false)}
            className="hidden sm:flex items-center justify-center rounded-full h-11 px-8 bg-primary text-white text-sm font-bold shadow-lg hover:brightness-95 transition-all"
          >
            Записаться
          </Link>
          
          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-slate-800 w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {isMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-100 p-8 flex flex-col gap-6 shadow-2xl"
        >
          {navLinks.map((link) => (
            <div key={link.name} className="flex flex-col gap-4">
              {link.href.startsWith("/") ? (
                <Link
                  to={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-slate-800 text-lg font-bold hover:text-primary transition-colors"
                >
                  {link.name}
                </Link>
              ) : (
                <a
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="text-slate-800 text-lg font-bold hover:text-primary transition-colors"
                >
                  {link.name}
                </a>
              )}
              
              {link.hasDropdown && (
                <div className="grid grid-cols-1 gap-2 pl-4 border-l-2 border-primary/10">
                  {servicesData.map((s) => (
                    <Link
                      key={s.id}
                      to={`/service/${s.id}`}
                      onClick={() => setIsMenuOpen(false)}
                      className="text-sm text-slate-500 hover:text-primary py-1"
                    >
                      {s.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Link 
            to="/booking"
            onClick={() => setIsMenuOpen(false)}
            className="w-full rounded-2xl h-14 bg-primary text-white text-base font-bold shadow-lg flex items-center justify-center"
          >
            Записаться онлайн
          </Link>
        </motion.div>
      )}
    </header>
  );
}
