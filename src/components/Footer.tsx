import { PlusSquare, MapPin, Phone, Mail, Instagram, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { useContent } from "../hooks/useContent";
import { useCmsField, useT } from "../hooks/useT";

interface SiteSettings {
  phone: string;
  email: string;
  address: string;
  address_lv?: string;
  socialLinks: { instagram?: string; telegram?: string };
}

interface FooterCms {
  brandDescription: string;
  brandDescription_lv?: string;
  contactsTitle: string;
  contactsTitle_lv?: string;
  scheduleTitle: string;
  scheduleTitle_lv?: string;
  scheduleWeekdays: string;
  scheduleWeekdays_lv?: string;
  scheduleWeekends: string;
  scheduleWeekends_lv?: string;
  infoTitle: string;
  infoTitle_lv?: string;
  copyright: string;
  copyright_lv?: string;
  madeWith: string;
  madeWith_lv?: string;
  infoLinks?: { name: string; name_lv?: string; href: string }[];
}

const defaultSettings: SiteSettings = {
  phone: "+371 00 000 000",
  email: "hello@estheticlab.ru",
  address: "Рига, Латвия",
  socialLinks: {},
};

const defaultFooter: FooterCms = {
  brandDescription: "Эстетическая косметология и профессиональный уход.\nАнастасия Букина, косметолог\n(ID: 59850068090)",
  contactsTitle: "Контакты",
  scheduleTitle: "График работы",
  scheduleWeekdays: "Пн - Пт: 09:00 - 20:00",
  scheduleWeekends: "Сб - Вс: по предварительной записи",
  infoTitle: "Информация",
  copyright: "© {year} SKINLAB. Все права защищены.",
  madeWith: "",
  infoLinks: [
    { name: "Правовая информация", href: "/legal-notice" },
    { name: "Политика конфиденциальности", href: "/privacy-policy" },
    { name: "Политика предоставления услуг", href: "/terms-of-service" },
    { name: "Политика Cookie", href: "/cookie-policy" },
  ],
};

export default function Footer() {
  const { data: settings } = useContent<SiteSettings>("settings/site", defaultSettings);
  const { data: footerCms } = useContent<FooterCms>("content/footer", defaultFooter);
  const t = useT();
  const f = useCmsField();

  const safeSettings = settings || defaultSettings;
  const cms = footerCms || defaultFooter;

  const copyrightText = f(cms, 'copyright', defaultFooter.copyright)
    .replace("{year}", String(new Date().getFullYear()));
  const infoLinks = cms.infoLinks && cms.infoLinks.length > 0
    ? cms.infoLinks
    : defaultFooter.infoLinks!;

  return (
    <footer id="footer" className="bg-white border-t border-slate-100">

      {/* ── Main body ── */}
      <div className="px-6 sm:px-12 lg:px-40 py-14">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">

          {/* Col 1 — Brand */}
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2.5 text-primary">
              <PlusSquare size={24} strokeWidth={1.8} />
              <span className="text-base font-bold text-slate-900 tracking-wide">SKINLAB</span>
            </div>
            <p className="text-slate-800 text-sm font-semibold leading-relaxed whitespace-pre-line">
              {f(cms, 'brandDescription')}
            </p>
            {/* Social icons — only if set */}
            {(safeSettings.socialLinks?.instagram || safeSettings.socialLinks?.telegram) && (
              <div className="flex items-center gap-3 mt-1">
                {safeSettings.socialLinks?.instagram && (
                  <a href={safeSettings.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary transition-colors">
                    <Instagram size={16} />
                  </a>
                )}
                {safeSettings.socialLinks?.telegram && (
                  <a href={safeSettings.socialLinks.telegram} target="_blank" rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-primary hover:border-primary transition-colors">
                    <Send size={16} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Col 2 — Contacts */}
          <div className="flex flex-col gap-5">
            <h3 className="text-base font-bold text-slate-900">
              {f(cms, 'contactsTitle', t('footer.contacts'))}
            </h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin size={15} className="text-primary" />
                </span>
                <span className="text-slate-800 font-semibold text-sm">{f(safeSettings, 'address')}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone size={15} className="text-primary" />
                </span>
                <a
                  href={`tel:${(safeSettings.phone || '').replace(/[^0-9+]/g, '')}`}
                  className="text-slate-800 font-semibold text-sm hover:text-primary transition-colors"
                >
                  {safeSettings.phone}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail size={15} className="text-primary" />
                </span>
                <a
                  href={`mailto:${safeSettings.email || ''}`}
                  className="text-slate-800 font-semibold text-sm hover:text-primary transition-colors"
                >
                  {safeSettings.email}
                </a>
              </div>
            </div>
          </div>

          {/* Col 3 — Schedule */}
          <div className="flex flex-col gap-5">
            <h3 className="text-base font-bold text-slate-900">
              {f(cms, 'scheduleTitle', t('footer.schedule'))}
            </h3>
            <div className="flex flex-col gap-2">
              <p className="text-slate-800 font-semibold text-sm">{f(cms, 'scheduleWeekdays')}</p>
              <p className="text-slate-800 font-semibold text-sm">{f(cms, 'scheduleWeekends')}</p>
            </div>
          </div>

        </div>
      </div>

      {/* ── Sub-footer: copyright + legal links ── */}
      <div className="border-t border-slate-100">
        <div className="max-w-[1200px] mx-auto px-6 sm:px-12 lg:px-40 py-5
          flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">

          {/* Copyright — primary color to match design */}
          <p className="text-primary text-xs font-medium shrink-0">{copyrightText}</p>

          {/* Legal links — primary color, wrap on mobile */}
          <nav className="flex flex-wrap items-center justify-start sm:justify-end gap-x-6 gap-y-2">
            {infoLinks.map((link, i) => (
              <Link
                key={i}
                to={link.href}
                className="text-primary text-xs font-medium hover:underline transition-colors whitespace-nowrap"
              >
                {f(link, 'name')}
              </Link>
            ))}
          </nav>

        </div>
      </div>

    </footer>
  );
}
