import { motion } from "motion/react";

export default function TermsOfService() {
  return (
    <div className="pt-32 pb-20 px-6 sm:px-12 lg:px-40 bg-white min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto prose prose-slate"
      >
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Условия использования</h1>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">1. Принятие условий</h2>
          <p className="text-slate-600 mb-4">
            Используя данный веб-сайт и записываясь на услуги SKINLAB, вы соглашаетесь с настоящими Условиями использования. Если вы не согласны с какими-либо из этих условий, пожалуйста, воздержитесь от использования сайта.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">2. Запись на услуги</h2>
          <p className="text-slate-600 mb-4">
            Запись на услуги осуществляется по предварительной договоренности через сайт, телефон или мессенджеры. Мы оставляем за собой право отказать в обслуживании при наличии медицинских противопоказаний или нарушении правил посещения.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">3. Отмена и перенос визита</h2>
          <p className="text-slate-600 mb-4">
            Пожалуйста, сообщайте об отмене или переносе визита не менее чем за 24 часа. Это позволяет нам эффективно планировать время и предоставлять качественные услуги всем клиентам.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">4. Ответственность</h2>
          <p className="text-slate-600 mb-4">
            Клиент несет ответственность за предоставление достоверной информации о состоянии своего здоровья и наличии аллергических реакций. Косметолог не несет ответственности за нежелательные последствия, возникшие в результате сокрытия клиентом важной медицинской информации.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">5. Интеллектуальная собственность</h2>
          <p className="text-slate-600 mb-4">
            Все материалы, размещенные на данном сайте (тексты, изображения, логотипы), являются интеллектуальной собственностью SKINLAB и защищены законом об авторском праве. Использование материалов без письменного согласия запрещено.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">6. Изменения условий</h2>
          <p className="text-slate-600 mb-4">
            Мы оставляем за собой право изменять настоящие Условия использования в любое время. Изменения вступают в силу с момента их публикации на сайте.
          </p>
        </section>
      </motion.div>
    </div>
  );
}
