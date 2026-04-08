import { motion } from "motion/react";

export default function CookiePolicy() {
  return (
    <div className="pt-32 pb-20 px-6 sm:px-12 lg:px-40 bg-white min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto prose prose-slate"
      >
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Политика использования файлов cookie</h1>
        
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">1. Что такое файлы cookie</h2>
          <p className="text-slate-600 mb-4">
            Файлы cookie — это небольшие текстовые файлы, которые сохраняются на вашем компьютере или мобильном устройстве при посещении веб-сайта. Они широко используются для обеспечения работы сайтов или повышения эффективности их работы, а также для предоставления информации владельцам сайта.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">2. Как мы используем файлы cookie</h2>
          <p className="text-slate-600 mb-4">
            Мы используем файлы cookie для следующих целей:
          </p>
          <ul className="list-disc pl-6 text-slate-600 mb-4">
            <li>Обеспечение базовой функциональности сайта;</li>
            <li>Анализ посещаемости сайта и поведения пользователей (с помощью Google Analytics);</li>
            <li>Улучшение пользовательского опыта и персонализация контента;</li>
            <li>Запоминание ваших предпочтений.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">3. Типы используемых файлов cookie</h2>
          <p className="text-slate-600 mb-4">
            На нашем сайте используются следующие типы файлов cookie:
          </p>
          <ul className="list-disc pl-6 text-slate-600 mb-4">
            <li><strong>Строго необходимые:</strong> Нужны для обеспечения работы сайта и его основных функций.</li>
            <li><strong>Аналитические:</strong> Позволяют нам собирать статистику посещений (анонимно).</li>
            <li><strong>Функциональные:</strong> Используются для запоминания ваших настроек (например, язык).</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">4. Как управлять файлами cookie</h2>
          <p className="text-slate-600 mb-4">
            Большинство браузеров позволяют вам контролировать файлы cookie через настройки. Вы можете заблокировать или удалить файлы cookie в любое время. Однако имейте в виду, что это может повлиять на функциональность сайта.
          </p>
          <p className="text-slate-600 mb-4">
            Инструкции по управлению файлами cookie для популярных браузеров:
          </p>
          <ul className="list-disc pl-6 text-slate-600 mb-4">
            <li>Google Chrome</li>
            <li>Mozilla Firefox</li>
            <li>Safari</li>
            <li>Microsoft Edge</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">5. Изменения политики</h2>
          <p className="text-slate-600 mb-4">
            Мы можем периодически обновлять нашу Политику использования файлов cookie. Пожалуйста, регулярно проверяйте эту страницу на наличие изменений.
          </p>
        </section>
      </motion.div>
    </div>
  );
}
