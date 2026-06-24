/**
 * Firestore Seed Script
 * 
 * Initializes the database with content from the existing static data.
 * Run ONCE from the admin panel (Dashboard → "Seed Database" button).
 * 
 * This populates:
 * - services/ collection (from servicesData.ts)
 * - content/ docs (hero, about, faq, cta)
 * - settings/site doc
 * - translations/ru doc (all UI strings in Russian)
 */

import { doc, setDoc, collection, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

// ─── Services ─────────────────────────────────────────────────────────────────

const servicesData = [
  {
    id: 'mesotherapy',
    title: 'Мезотерапия',
    description: 'Инъекционный метод для решения определенных проблем с помощью мезококтейлей.',
    iconName: 'Syringe',
    seoTitle: 'Мезотерапия в Риге | Эстетическая косметология SKINLAB',
    seoDescription: 'Профессиональная мезотерапия лица и тела в Риге. Индивидуальные мезококтейли для сияния, увлажнения и омоложения кожи.',
    image: 'https://picsum.photos/seed/cosmetology-injection/800/400',
    treatments: [
      { name: 'RRS HA Eyes', description: 'Прощайте, темные круги и отеки! Специальный коктейль для нежной кожи вокруг глаз, который возвращает взгляду свежесть и сияние.', price: '65 €', indications: ['Темные круги под глазами', 'Отечность', 'Мелкие морщинки', 'Уставший взгляд'], results: ['Осветление зоны вокруг глаз', 'Уменьшение отеков', 'Разглаживание мелких морщин', 'Свежий и отдохнувший вид'], detailedDescription: 'RRS HA Eyes — это инъекционный коктейль, специально разработанный для деликатной зоны вокруг глаз.' },
      { name: 'Plinest Eye', description: 'Премиальное восстановление на клеточном уровне. Мощная регенерация для молодого взгляда.', price: '180 €', indications: ['Глубокие морщины вокруг глаз', 'Потеря тонуса', 'Дряблость кожи'], results: ['Мощный лифтинг-эффект', 'Уплотнение кожи', 'Заметное сокращение морщин'], detailedDescription: 'Plinest Eye — это биорепарант на основе полинуклеотидов (ПДРН).' },
      { name: 'RRS HA Injectable', description: 'Эликсир жизни для уставшей кожи. Глубокое питание и защита от стресса.', price: 'от 110 €', indications: ['Сухость кожи', 'Тусклый цвет лица', 'Мелкие морщины'], results: ['Интенсивное увлажнение', 'Сияющий тон кожи', 'Улучшение микрорельефа'], detailedDescription: 'Комплексный препарат для мезотерапии, содержащий нестабилизированную гиалуроновую кислоту.' },
      { name: 'RRS Skin Relax (аналог ботокса)', description: 'Безопасная альтернатива ботоксу. Мягкое расслабление мимических мышц.', price: '90 €', indications: ['Мимические морщины', 'Напряженное выражение лица'], results: ['Разглаживание мимических морщин', 'Эффект отдохнувшего лица'], detailedDescription: 'Препарат содержит пептиды-миорелаксанты.' },
      { name: 'RRS HA Cellutrix', description: 'Ваш секрет идеального силуэта. Эффективная борьба с целлюлитом.', price: 'от 70 €', indications: ['Целлюлит', 'Локальные жировые отложения'], results: ['Уменьшение выраженности целлюлита', 'Разглаживание кожи'], detailedDescription: 'Специализированный коктейль для тела.' },
      { name: 'RRS XL Hair', description: 'Сила и густота ваших волос. Пробуждаем спящие луковицы.', price: '80 €', indications: ['Выпадение волос', 'Истончение волос'], results: ['Остановка выпадения', 'Стимуляция роста'], detailedDescription: 'Мощный биостимулятор для волос.' },
      { name: 'Apriline Cellbooster Hair', description: 'Интеллектуальный уход за волосами. Концентрированный коктейль витаминов.', price: '110 €', indications: ['Ломкость волос', 'Потеря блеска'], results: ['Роскошный блеск', 'Укрепление волос'], detailedDescription: 'Инновационный комплекс с гиалуроновой кислотой.' },
    ],
  },
  {
    id: 'biorevitalization',
    title: 'Биоревитализация',
    description: 'Глубокое увлажнение и оживление кожи изнутри. Возвращаем тонус, эластичность и здоровое сияние.',
    iconName: 'Droplets',
    seoTitle: 'Биоревитализация гиалуроновой кислотой в Риге | SKINLAB',
    seoDescription: 'Глубокое увлажнение кожи гиалуроновой кислотой.',
    image: 'https://picsum.photos/seed/skin-hydration/800/400',
    treatments: [
      { name: 'Биоревитализация губ', description: 'Глубокое увлажнение и естественная сочность для губ.', price: '120 €', indications: ['Сухость губ', 'Потеря цвета'], results: ['Глубокое увлажнение', 'Естественная яркость'], detailedDescription: 'Процедура направлена на восстановление гидробаланса нежной кожи губ.' },
      { name: 'Neauvia Hydro Deluxe', description: 'Золотой стандарт увлажнения. Гиалуроновая кислота + кальций.', price: '180 €', indications: ['Обезвоженная кожа', 'Снижение тургора'], results: ['Глубокое увлажнение', 'Повышение плотности'], detailedDescription: 'Neauvia Hydro Deluxe содержит высокую концентрацию чистой гиалуроновой кислоты.' },
      { name: 'Stylage Hydro', description: 'Глоток воды для вашей кожи. Восстанавливает эластичность и тонус.', price: '150 €', indications: ['Потеря эластичности', 'Стрессовая кожа'], results: ['Восстановление тонуса', 'Эластичная кожа'], detailedDescription: 'Классический биоревитализант от французской лаборатории Vivacy.' },
    ],
  },
  {
    id: 'biostimulation',
    title: 'Биостимуляция',
    description: 'Запускаем естественные процессы омоложения. Процедуры, которые заставляют вашу кожу работать на красоту.',
    iconName: 'Sparkles',
    seoTitle: 'Биостимуляция в Риге | Регенеративная косметология SKINLAB',
    seoDescription: 'Активация выработки собственного коллагена и эластина.',
    image: 'https://picsum.photos/seed/face-glow/800/400',
    treatments: [
      { name: 'Plinest (ПДРН)', description: 'Революция в омоложении. Глубокое восстановление структуры кожи.', price: '190 €', indications: ['Рубцы и постакне', 'Снижение тургора'], results: ['Восстановление структуры', 'Повышение упругости'], detailedDescription: 'Plinest — это препарат на основе высокоочищенных полинуклеотидов.' },
      { name: 'RRS Long Lasting', description: 'Уникальный препарат для мгновенного преображения. Лифтинг-эффект.', price: '200 €', indications: ['Потеря четкости овала лица', 'Носогубные складки'], results: ['Мгновенный лифтинг', 'Четкие контуры лица'], detailedDescription: 'Гибридный препарат, сочетающий свойства филлера и биоревитализанта.' },
      { name: 'RRS HA Hyalift 75 proactive', description: 'Интенсивная терапия для зрелой кожи. Мощный лифтинг-эффект.', price: 'от 120 €', indications: ['Выраженные возрастные изменения', 'Глубокие морщины'], results: ['Заметное сокращение морщин', 'Повышение плотности'], detailedDescription: 'Высококонцентрированный препарат для интенсивного омоложения.' },
      { name: 'Xela Rederm 1,1%', description: 'Спасение для чувствительной кожи. Эффективное лечение купероза.', price: '190 €', indications: ['Купероз и розацеа', 'Чувствительная кожа'], results: ['Укрепление сосудистой стенки', 'Уменьшение покраснений'], detailedDescription: 'Уникальный препарат на основе гиалуроновой и янтарной кислот.' },
      { name: 'Meso-Wharton P199', description: 'Перезагрузка молодости. Активирует собственные стволовые клетки кожи.', price: '220 €', indications: ['Возраст 40+', 'Глубокие морщины'], results: ['Глобальное омоложение', 'Уплотнение дермы'], detailedDescription: 'Инновационный биорепарант, содержащий синтетический аналог эмбрионального пептида.' },
      { name: 'Meso-Xanthin F199', description: 'Глянцевое сияние и безупречный тон. Защита от фотостарения.', price: '220 €', indications: ['Пигментация', 'Неровный тон', 'Фотостарение'], results: ['Безупречный цвет лица', 'Осветление пигментации'], detailedDescription: 'Легендарный препарат для восстановления поврежденной ДНК клеток.' },
    ],
  },
  {
    id: 'skincare',
    title: 'Уходовые процедуры',
    description: 'Искусство эстетического ухода. Ритуалы красоты, которые дарят вашей коже здоровье и свежесть.',
    iconName: 'Smile',
    seoTitle: 'Профессиональный уход за лицом в Риге | SKINLAB',
    seoDescription: 'Эстетические процедуры для всех типов кожи.',
    image: 'https://picsum.photos/seed/facial-care/800/400',
    treatments: [
      { name: 'Anti Acne программа', description: 'Авторская программа для проблемной кожи. Индивидуальные протоколы.', price: '60 €', indications: ['Акне', 'Частые высыпания', 'Жирный блеск'], results: ['Сокращение высыпаний', 'Чистая кожа'], detailedDescription: 'Квинтэссенция знаний и практического опыта.' },
      { name: 'Чистка лица', description: 'Абсолютная чистота. Ультразвук и мануальные техники.', price: '80 €', indications: ['Комедоны', 'Расширенные поры'], results: ['Глубокое очищение пор', 'Гладкость кожи'], detailedDescription: 'Профессиональная чистка лица включает несколько этапов.' },
      { name: 'Чистка спины', description: 'Забота о красоте вашей спины. Глубокое очищение.', price: '80 €', indications: ['Высыпания на спине', 'Черные точки'], results: ['Чистая кожа', 'Гладкость'], detailedDescription: 'Глубокое очищение, эксфолиация, мануальная чистка.' },
      { name: 'Микронидлинг (Dermapen)', description: 'Микроигольчатая терапия для макро-результатов.', price: '90 €', indications: ['Рубцы постакне', 'Расширенные поры'], results: ['Обновление текстуры', 'Сокращение пор'], detailedDescription: 'С помощью Dermapen создаются микроканалы для активных сывороток.' },
      { name: 'Безинъекционные жидкие нити', description: 'Безоперационная подтяжка лица. Инновационные жидкие нити.', price: '120 €', indications: ['Начальный птоз', 'Потеря тонуса'], results: ['Подтяжка овала', 'Разглаживание морщин'], detailedDescription: 'Нити на основе коллагена и пептидов растворяются без проколов.' },
    ],
  },
  {
    id: 'complex',
    title: 'Комплексные процедуры',
    description: 'Синергия методик для максимального эффекта. Индивидуальные программы совершенства.',
    iconName: 'Users',
    seoTitle: 'Комплексные программы омоложения в Риге | SKINLAB',
    seoDescription: 'Индивидуальные программы преображения.',
    image: 'https://picsum.photos/seed/beauty-spa/800/400',
    treatments: [
      { name: 'GLOW EFFECT', description: 'Авторская программа для стеклянной кожи.', price: '140 €', indications: ['Тусклый цвет лица', 'Обезвоженность'], results: ['Эффект стеклянной кожи', 'Глубокое увлажнение'], detailedDescription: 'Деликатный пилинг + мезотерапия + успокаивающая маска.' },
      { name: 'ANTI POSTACNE', description: 'Победа над несовершенствами. Интенсивный курс.', price: '120 €', indications: ['Следы постакне', 'Застойные пятна'], results: ['Выравнивание рельефа', 'Осветление пятен'], detailedDescription: 'Химический пилинг + микронидлинг.' },
      { name: 'ANTI POSTACNE 2.0', description: 'Усиленная программа для глубоких рубцов постакне.', price: '210 €', indications: ['Глубокие атрофические рубцы', 'Выраженный рельеф'], results: ['Значительное выравнивание рельефа', 'Гладкая кожа'], detailedDescription: 'Субцизия + лечебный пилинг.' },
    ],
  },
  {
    id: 'peels',
    title: 'Пилинги',
    description: 'Обновление и сияние. Профессиональные составы для безупречной текстуры.',
    iconName: 'Zap',
    seoTitle: 'Химические пилинги в Риге | SKINLAB',
    seoDescription: 'Профессиональные химические пилинги для лица.',
    image: 'https://picsum.photos/seed/skin-peel/800/400',
    treatments: [
      { name: 'Anti age пилинг', description: 'Мощная антивозрастная терапия. Разглаживает морщины.', price: '50 €', indications: ['Возрастные изменения', 'Морщины'], results: ['Разглаживание морщин', 'Лифтинг-эффект'], detailedDescription: 'Специализированный пилинг с омолаживающим действием.' },
      { name: 'Anti pigment пилинг', description: 'Осветляющий пилинг против гиперпигментации.', price: '60 €', indications: ['Гиперпигментация', 'Мелазма'], results: ['Осветление пятен', 'Ровный тон'], detailedDescription: 'Блокирует синтез меланина.' },
      { name: 'Пилинг для сияния', description: 'Витаминный коктейль для мгновенного преображения.', price: '40 €', indications: ['Тусклая кожа', 'Усталый вид'], results: ['Мгновенное сияние', 'Свежий вид'], detailedDescription: 'Легкий поверхностный пилинг.' },
      { name: 'BioRePeel Cl3', description: 'Двухфазный инновационный пилинг с биоревитализацией.', price: '70 €', indications: ['Акне', 'Расширенные поры', 'Тусклый цвет'], results: ['Мгновенный лифтинг', 'Выравнивание тона'], detailedDescription: 'Итальянский патентованный пилинг.' },
    ],
  },
  {
    id: 'consultation',
    title: 'Консультация',
    description: 'Персональный план вашей красоты. Профессиональная диагностика и подбор ухода.',
    iconName: 'UserSearch',
    seoTitle: 'Консультация косметолога в Риге | SKINLAB',
    seoDescription: 'Первичная диагностика кожи и составление плана процедур.',
    image: 'https://picsum.photos/seed/doctor-consultation/800/400',
    treatments: [
      { name: 'Первый визит с процедурой', description: 'Глубокая диагностика и первая процедура.', price: '80 €', indications: ['Первичное обращение', 'Диагностика'], results: ['Индивидуальный план', 'Проведенная процедура'], detailedDescription: 'Комплексный прием с консультацией и процедурой.' },
      { name: 'Первый визит без процедуры', description: 'Диагностика и составление плана без манипуляций.', price: '50 €', indications: ['Консультация', 'Планирование'], results: ['Подробный план процедур', 'Диагностика'], detailedDescription: 'Полноценная консультация косметолога.' },
      { name: 'Консультация ONLINE', description: 'Экспертное мнение онлайн. Разбор кожи и план красоты.', price: '40 €', indications: ['Невозможность очного визита'], results: ['Персональные рекомендации', 'План процедур'], detailedDescription: 'Видеоконсультация с анализом кожи.' },
    ],
  },
];

// ─── UI Translations (Russian base) ─────────────────────────────────────────

const ruTranslations: Record<string, string> = {
  // Navigation
  nav_home: 'Главная',
  nav_training: 'Обучение',
  nav_shop: 'Магазин',
  nav_services: 'Услуги',
  nav_book: 'Записаться',
  nav_book_online: 'Записаться онлайн',

  // Hero
  hero_popular_procedures: 'Популярные процедуры',
  hero_learn_more: 'Подробнее',

  // About
  about_title: 'Ваша красота — моя страсть',
  about_subtitle: 'Я верю, что настоящая красота — это здоровье вашей кожи, а не маски или фильтры.',
  about_text: 'Меня зовут Виктория Букина. Я — косметолог с многолетним опытом работы в эстетической медицине. Мой подход — это глубокая диагностика, индивидуальные протоколы и честный результат без лишних обещаний.',
  about_cta: 'Познакомиться ближе',

  // Services
  services_title: 'Наши услуги',
  services_subtitle: 'Каждая процедура — шаг к вашей лучшей версии',
  services_view_all: 'Все услуги',
  services_book: 'Записаться',
  services_detail_price: 'Цена',
  services_detail_indications: 'Показания',
  services_detail_results: 'Результаты',
  services_detail_description: 'Описание процедуры',
  services_detail_back: 'Назад к услугам',

  // FAQ
  faq_title: 'Часто задаваемые вопросы',
  faq_subtitle: 'Отвечаю на самые популярные вопросы о процедурах и уходе',

  // CTA
  cta_title: 'Готовы начать свой путь к идеальной коже?',
  cta_subtitle: 'Запишитесь на консультацию и получите персональный план процедур',
  cta_button: 'Записаться на консультацию',

  // Booking
  booking_title: 'Запись на приём',
  booking_subtitle: 'Заполните форму и я свяжусь с вами для подтверждения',
  booking_name: 'Ваше имя',
  booking_phone: 'Телефон',
  booking_email: 'Email',
  booking_service: 'Услуга',
  booking_treatment: 'Процедура',
  booking_date: 'Дата',
  booking_time: 'Время',
  booking_message: 'Дополнительно',
  booking_submit: 'Отправить заявку',
  booking_success: 'Заявка отправлена! Я свяжусь с вами в ближайшее время.',
  booking_error: 'Что-то пошло не так. Попробуйте ещё раз.',
  booking_select_service: 'Выберите услугу',
  booking_select_treatment: 'Выберите процедуру',

  // Footer
  footer_tagline: 'Профессиональная косметология в Риге',
  footer_address: 'Рига, Латвия',
  footer_phone: '+371 00 000 000',
  footer_email: 'info@skinlab.lv',
  footer_nav_services: 'Услуги',
  footer_nav_about: 'О нас',
  footer_nav_booking: 'Запись',
  footer_nav_training: 'Обучение',
  footer_legal: 'Правовая информация',
  footer_privacy: 'Политика конфиденциальности',
  footer_terms: 'Условия использования',
  footer_cookies: 'Cookie-политика',
  footer_rights: '© {year} SKINLAB. Все права защищены.',

  // Cookie
  cookie_text: 'Мы используем файлы cookie для улучшения вашего опыта.',
  cookie_accept: 'Принять',
  cookie_decline: 'Отклонить',

  // Coming Soon
  coming_soon_text: 'Скоро здесь появится что-то особенное',
  coming_soon_back: 'На главную',

  // Common
  common_loading: 'Загрузка...',
  common_error: 'Произошла ошибка',
};

// ─── Hero content ─────────────────────────────────────────────────────────────

const heroContent = {
  slides: [
    {
      id: 'biorevitalization',
      title: 'Биоревитализация губ',
      treatment: 'Биоревитализация губ',
      description: 'Глубокое увлажнение и естественное омоложение нежной кожи губ без лишнего объема.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAtp0tgmoq8H8VkoYpTfde-g2SiD2Hp4JAHF6x6EihDJs2sgiFP1jaaCfHzzLtQON3-e2gzyiePtFvMDTP9Z0_Z3mGXMTmCHqXMoxVHYAYqeW1cG2BgsXEBuZOTSU5fJ7MTAQlT_jpQC-U6caDWnwXdkpoH77LrSlo2UPo25H14wkWMhL0yRkFt7PWbaqznQBdPQtL74--8aMK_OD9hzfAoDGLfGSIbRObFIrpUw55S1tl7YqJFeUKCNaH-jWhCr5PRYLQ5A7nWk0',
    },
    {
      id: 'biostimulation',
      title: 'Лифтинг процедура',
      treatment: 'RRS Long Lasting',
      description: 'Эффективная подтяжка контура лица и восстановление упругости кожи.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9E_7DtdQw87OXojMDqLev4StKkVBR3C9vXIzOowBhaM4kgFiVz5WwatGxLep9EU-XZyhBYuep-MpGSB8LBag5ElM8CPEP3jT4dgreMpg_zXvCp7GB-EjtCIoHsUoT95t0QsWpu2KASA7S-pBH1rt2bHu1kvCq-cC8hbQT8pCnayfgY9lKynkQjOk1ccXy_1wqnLuKIqbTOISKMTOV3piES_PVzZ86Gz0ekNZvGIkiI2qI5Vrovce7Lhzujpaj3scTDs_kg5l3vDk',
    },
    {
      id: 'biostimulation',
      title: 'Полинуклеотиды',
      treatment: 'Plinest (ПДРН)',
      description: 'Активация собственных ресурсов кожи для восстановления сияния и молодости.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA8lPW7kCyjP28pp6cZz7qGaarPSv65uWZxKcf5q5ffXo0_f3LxEqy_LlKczbB5uniXnnQqoi11Zw5XL-8EUZDm52AKlpFwZSn-4emzegH9REH1wxK0KkrpmDdJcgotUmLE_Yst0J6hXQd_spXLLhmyhEeBpuIHy2eCFoRhikCFAGTztObw_cPpCJRx_WwGvxSGeMjanZ8h5vAGMP1FEPGGwO7XfknCX2WjOahkaGmhE9vRHXciifrdJWUsHhK60aDH8fuAm7vn8n4',
    },
    {
      id: 'skincare',
      title: 'Anti Acne программа',
      treatment: 'Anti Acne программа',
      description: 'Индивидуальные протоколы способны ввести в ремиссию самую проблемную кожу.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCutOcZcwT0JItrGo28bEgGPqRyJXE0waqPW9DxU3oef-dJYZFNEgtwITlKzCZcQIcVYCsCiOc3T7klNs8tu6D5fqLzQxx7wxk3WNqmsXqnEEgBBk2NPXuQvM0dlYk3jzj5WtM2NI508pVNn3GvjVyCeNp142E0oFQgbSV9WkJcO72ktFeRg89pljwIuBm0jH9CgohUzyDARpNqWchPXHpEBXTiZp9lsgGm08MgP8St2gyqu6m8hZaIbvDYxcfg',
    },
  ],
};

// ─── About content ────────────────────────────────────────────────────────────

const aboutContent = {
  title: 'Ваша красота — моя страсть',
  subtitle: 'Я верю, что настоящая красота — это здоровье вашей кожи, а не маски или фильтры.',
  text: 'Меня зовут Виктория Букина. Я — косметолог с многолетним опытом работы в эстетической медицине. Мой подход — это глубокая диагностика, индивидуальные протоколы и честный результат без лишних обещаний.',
  imageUrl: 'https://picsum.photos/seed/cosmetologist-portrait/600/800',
  stats: [
    { value: '8+', label: 'лет опыта' },
    { value: '500+', label: 'клиентов' },
    { value: '20+', label: 'процедур' },
  ],
};

// ─── FAQ content ──────────────────────────────────────────────────────────────

const faqContent = {
  items: [
    { question: 'Больно ли делать инъекционные процедуры?', answer: 'Большинство инъекционных процедур проводятся с использованием аппликационной анестезии. Ощущения индивидуальны, но как правило дискомфорт минимален и хорошо переносится.' },
    { question: 'Как долго длится результат?', answer: 'Продолжительность эффекта зависит от типа процедуры и индивидуальных особенностей кожи. В среднем: биоревитализация — 4-6 месяцев, пилинги — 1-3 месяца.' },
    { question: 'Когда виден результат?', answer: 'Некоторые процедуры дают мгновенный эффект (пилинги, уходы). Инъекционные процедуры показывают максимальный результат через 2-4 недели.' },
    { question: 'Есть ли противопоказания?', answer: 'Да, как и у любой медицинской процедуры. Беременность, лактация, острые воспаления, аутоиммунные заболевания — основные ограничения. Всё обсуждается на консультации.' },
    { question: 'Нужна ли подготовка к процедурам?', answer: 'За неделю рекомендуется исключить пилинговые средства. За 2 недели до инъекций — отказаться от препаратов, разжижающих кровь (по согласованию с врачом).' },
    { question: 'Как часто нужно проходить процедуры?', answer: 'Частота зависит от задачи. Поддерживающие процедуры — 1 раз в 1-3 месяца. Лечебные курсы — по индивидуальному протоколу (обычно 3-6 сеансов).' },
  ],
};

// ─── CTA content ──────────────────────────────────────────────────────────────

const ctaContent = {
  title: 'Готовы начать свой путь к идеальной коже?',
  subtitle: 'Запишитесь на консультацию и получите персональный план процедур',
  buttonText: 'Записаться на консультацию',
};

// ─── Settings ─────────────────────────────────────────────────────────────────

const siteSettings = {
  phone: '+371 00 000 000',
  email: 'info@skinlab.lv',
  address: 'Рига, Латвия',
  socialLinks: {
    instagram: 'https://instagram.com/skinlab',
    telegram: 'https://t.me/skinlab',
  },
  telegramBotToken: '',
  telegramChatId: '',
  googleCalendarId: 'primary',
};

// ─── Main seed function ───────────────────────────────────────────────────────

export async function seedDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    const batch = writeBatch(db);

    // Services
    for (const service of servicesData) {
      const { id, ...data } = service;
      batch.set(doc(db, 'services', id), data);
    }

    // Content
    batch.set(doc(db, 'content', 'hero'), heroContent);
    batch.set(doc(db, 'content', 'about'), aboutContent);
    batch.set(doc(db, 'content', 'faq'), faqContent);
    batch.set(doc(db, 'content', 'cta'), ctaContent);

    // Settings
    batch.set(doc(db, 'settings', 'site'), siteSettings);

    // Russian translations
    batch.set(doc(db, 'translations', 'ru'), ruTranslations);

    await batch.commit();

    return { success: true, message: 'База данных успешно заполнена!' };
  } catch (error: any) {
    return { success: false, message: `Ошибка: ${error.message}` };
  }
}
