import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import ScrollToTop from "./components/ScrollToTop";
import CookieConsent from "./components/CookieConsent";
import Hero from "./components/Hero";
import About from "./components/About";
import Services from "./components/Services";
import FAQ from "./components/FAQ";
import CTA from "./components/CTA";
import Footer from "./components/Footer";
import ServiceDetail from "./pages/ServiceDetail";
import ServicesPage from "./pages/ServicesPage";
import AboutPage from "./pages/AboutPage";
import BookingPage from "./pages/BookingPage";
import ComingSoon from "./pages/ComingSoon";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import TermsOfService from "./pages/legal/TermsOfService";
import CookiePolicy from "./pages/legal/CookiePolicy";
import LegalNotice from "./pages/legal/LegalNotice";

function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <Services />
      <FAQ />
      <CTA />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <CookieConsent />
      <div className="min-h-screen bg-white">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/service/:id" element={<ServiceDetail />} />
            <Route path="/training" element={<ComingSoon title="Обучение" />} />
            <Route path="/shop" element={<ComingSoon title="Магазин" />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route path="/legal-notice" element={<LegalNotice />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
