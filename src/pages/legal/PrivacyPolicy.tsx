import { motion } from "motion/react";

export default function PrivacyPolicy() {
  return (
    <div className="pt-32 pb-20 px-6 sm:px-12 lg:px-40 bg-white min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto prose prose-slate"
      >
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Политика конфиденциальности</h1>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">1. Общие положения</h2>
          <p className="text-slate-600 mb-4">
            Настоящая политика обработки персональных данных составлена в соответствии с требованиями Общего регламента по защите данных (GDPR) и определяет порядок обработки персональных данных и меры по обеспечению безопасности персональных данных, предпринимаемые SKINLAB (далее — Оператор).
          </p>
          <p className="text-slate-600 mb-4">
            Оператор ставит своей важнейшей целью и условием осуществления своей деятельности соблюдение прав и свобод человека и гражданина при обработке его персональных данных, в том числе защиты прав на неприкосновенность частной жизни, личную и семейную тайну.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">2. Какие данные мы собираем</h2>
          <p className="text-slate-600 mb-4">
            Мы можем собирать следующую информацию:
          </p>
          <ul className="list-disc pl-6 text-slate-600 mb-4">
            <li>Имя и фамилия;</li>
            <li>Контактная информация, включая адрес электронной почты;</li>
            <li>Номер телефона;</li>
            <li>Информация о состоянии здоровья (только в объеме, необходимом для безопасного проведения косметологических процедур).</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">3. Цели обработки данных</h2>
          <p className="text-slate-600 mb-4">
            Ваши данные используются для:
          </p>
          <ul className="list-disc pl-6 text-slate-600 mb-4">
            <li>Записи на прием и подтверждения визита;</li>
            <li>Предоставления консультаций и услуг;</li>
            <li>Связи с вами по вопросам обслуживания;</li>
            <li>Соблюдения юридических обязательств.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">4. Хранение и защита данных</h2>
          <p className="text-slate-600 mb-4">
            Безопасность персональных данных, которые обрабатываются Оператором, обеспечивается путем реализации правовых, организационных и технических мер, необходимых для выполнения в полном объеме требований действующего законодательства в области защиты персональных данных.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">5. Ваши права</h2>
          <p className="text-slate-600 mb-4">
            В соответствии с GDPR вы имеете право на:
          </p>
          <ul className="list-disc pl-6 text-slate-600 mb-4">
            <li>Доступ к вашим персональным данным;</li>
            <li>Исправление неточных данных;</li>
            <li>Удаление данных («право быть забытым»);</li>
            <li>Ограничение обработки;</li>
            <li>Переносимость данных.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">6. Контакты</h2>
          <p className="text-slate-600 mb-4">
            По всем вопросам, связанным с обработкой ваших данных, вы можете связаться с нами по адресу: hello@estheticlab.ru
          </p>
        </section>
      </motion.div>
    </div>
  );
}
