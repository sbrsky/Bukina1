import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 bg-white border-t border-slate-200 shadow-2xl"
        >
          <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-slate-600 text-sm text-center sm:text-left">
              Мы используем файлы cookie, чтобы обеспечить вам лучший опыт на нашем сайте. 
              Продолжая использовать сайт, вы соглашаетесь с нашей{" "}
              <Link to="/cookie-policy" className="text-primary hover:underline">
                политикой использования файлов cookie
              </Link>.
            </div>
            <div className="flex gap-4 shrink-0">
              <button
                onClick={handleAccept}
                className="px-6 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Принять
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
