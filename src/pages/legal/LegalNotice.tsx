import { motion } from "motion/react";

export default function LegalNotice() {
  return (
    <div className="pt-32 pb-20 px-6 sm:px-12 lg:px-40 bg-white min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto prose prose-slate"
      >
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Правовая информация (Impressum)</h1>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Информация о владельце</h2>
          <p className="text-slate-600 mb-2"><strong>Название:</strong> SKINLAB</p>
          <p className="text-slate-600 mb-2"><strong>Владелец:</strong> Анастасия Букина</p>
          <p className="text-slate-600 mb-2"><strong>Регистрационный номер косметолога:</strong> 59850068090</p>
          <p className="text-slate-600 mb-2"><strong>Адрес:</strong> Рига, Латвия</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Контактные данные</h2>
          <p className="text-slate-600 mb-2"><strong>Телефон:</strong> +371 00 000 000</p>
          <p className="text-slate-600 mb-2"><strong>Email:</strong> hello@estheticlab.ru</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Разрешение споров</h2>
          <p className="text-slate-600 mb-4">
            Европейская комиссия предоставляет платформу для онлайн-разрешения споров (ODR): <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://ec.europa.eu/consumers/odr</a>.
          </p>
          <p className="text-slate-600 mb-4">
            Мы не обязаны и не готовы участвовать в процедурах разрешения споров в арбитражном совете потребителей.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Отказ от ответственности</h2>
          <p className="text-slate-600 mb-4">
            Несмотря на тщательный контроль содержания, мы не несем ответственности за содержание внешних ссылок. За содержание страниц, на которые ведут ссылки, несут исключительную ответственность их операторы.
          </p>
        </section>
      </motion.div>
    </div>
  );
}
