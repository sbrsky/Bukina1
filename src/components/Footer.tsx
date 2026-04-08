import { PlusSquare, MapPin, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer id="footer" className="px-6 sm:px-12 lg:px-40 py-16 border-t border-slate-100 bg-white">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3 text-primary">
            <PlusSquare size={28} />
            <h2 className="text-lg font-bold text-slate-900">SKINLAB</h2>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Профессиональная эстетическая косметология в Риге — LabSkin.<br />
            Анастасия Букина, косметолог с высшим медицинским образованием <br /> 
            (ID: 59850068090)
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <h3 className="text-lg font-bold text-slate-900">Контакты</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-600">
              <MapPin size={20} className="text-primary shrink-0" />
              <span className="text-slate-700">Рига, Латвия</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <Phone size={20} className="text-primary shrink-0" />
              <span className="text-slate-700">+371 00 000 000</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <Mail size={20} className="text-primary shrink-0" />
              <span className="text-slate-700">hello@estheticlab.ru</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <h3 className="text-lg font-bold text-slate-900">График работы</h3>
          <div className="text-slate-600">
            <p className="text-slate-700">По предварительной записи</p>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <h3 className="text-lg font-bold text-slate-900">Юридическая информация</h3>
          <div className="flex flex-col gap-3 text-sm">
            <Link to="/legal-notice" className="text-slate-600 hover:text-primary transition-colors">Правовая информация</Link>
            <Link to="/privacy-policy" className="text-slate-600 hover:text-primary transition-colors">Политика конфиденциальности</Link>
            <Link to="/terms-of-service" className="text-slate-600 hover:text-primary transition-colors">Условия использования</Link>
            <Link to="/cookie-policy" className="text-slate-600 hover:text-primary transition-colors">Политика Cookie</Link>
          </div>
        </div>
      </div>
      
      <div className="max-w-[1200px] mx-auto mt-16 pt-8 border-t border-slate-100 text-center text-slate-400 text-sm">
        © 2024 SKINLAB. Все права защищены. Имеются противопоказания, необходима консультация специалиста.
      </div>
    </footer>
  );
}
