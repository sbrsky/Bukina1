import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LangProvider } from "./context/LangContext";
import { Suspense, lazy } from "react";
import Header from "./components/Header";
import ScrollToTop from "./components/ScrollToTop";
import CookieConsent from "./components/CookieConsent";
import Hero from "./components/Hero";
import About from "./components/About";
import Services from "./components/Services";
import FAQ from "./components/FAQ";
import CTA from "./components/CTA";
import Footer from "./components/Footer";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";

// ── Lazy-loaded pages (loaded only when navigated to) ──────────────────────────
const ServiceDetail  = lazy(() => import("./pages/ServiceDetail"));
const ServicesPage   = lazy(() => import("./pages/ServicesPage"));
const WorksPage      = lazy(() => import("./pages/WorksPage"));
const AboutPage      = lazy(() => import("./pages/AboutPage"));
const BookingPage       = lazy(() => import("./pages/BookingPage"));
const BookingCancelPage = lazy(() => import("./pages/BookingCancelPage"));
const ComingSoon     = lazy(() => import("./pages/ComingSoon"));
const HomeV2         = lazy(() => import("./pages/v2/HomeV2"));
const HomeV3         = lazy(() => import("./pages/HomeV3"));
const PrivacyPolicy  = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const CookiePolicy   = lazy(() => import("./pages/legal/CookiePolicy"));
const LegalNotice    = lazy(() => import("./pages/legal/LegalNotice"));

// Admin — separate lazy group (not needed until /admin is visited)
const LoginPage       = lazy(() => import("./pages/admin/LoginPage"));
const AdminLayout     = lazy(() => import("./pages/admin/AdminLayout"));
const Dashboard       = lazy(() => import("./pages/admin/Dashboard"));
const ContentEditor   = lazy(() => import("./pages/admin/ContentEditor"));
const WorksEditor     = lazy(() => import("./pages/admin/WorksEditor"));
const ServicesEditor  = lazy(() => import("./pages/admin/ServicesEditor"));
const BookingsManager = lazy(() => import("./pages/admin/BookingsManager"));
const SlotsManager    = lazy(() => import("./pages/admin/SlotsManager"));
const SettingsEditor  = lazy(() => import("./pages/admin/SettingsEditor"));

// ── Minimal page-level suspense fallback ──────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}

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
    <LangProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* ── Admin routes (no Header/Footer) ── */}
          <Route
            path="/admin/login"
            element={
              <Suspense fallback={<PageLoader />}>
                <LoginPage />
              </Suspense>
            }
          />
          <Route
            path="/admin/*"
            element={
              <ProtectedAdminRoute>
                <Suspense fallback={<PageLoader />}>
                  <AdminLayout />
                </Suspense>
              </ProtectedAdminRoute>
            }
          >
            <Route index element={<Suspense fallback={<PageLoader />}><Dashboard /></Suspense>} />
            <Route path="content"      element={<Suspense fallback={<PageLoader />}><ContentEditor /></Suspense>} />
            <Route path="works"        element={<Suspense fallback={<PageLoader />}><WorksEditor /></Suspense>} />
            <Route path="services"     element={<Suspense fallback={<PageLoader />}><ServicesEditor /></Suspense>} />
            <Route path="bookings"     element={<Suspense fallback={<PageLoader />}><BookingsManager /></Suspense>} />
            <Route path="slots"        element={<Suspense fallback={<PageLoader />}><SlotsManager /></Suspense>} />
            <Route path="settings"     element={<Suspense fallback={<PageLoader />}><SettingsEditor /></Suspense>} />
          </Route>

          {/* ── V2 standalone (own header/footer/theme) ── */}
          <Route
            path="/v2"
            element={
              <Suspense fallback={<PageLoader />}>
                <HomeV2 />
              </Suspense>
            }
          />

          {/* ── V3 standalone (medical white 2026) ── */}
          <Route
            path="/v3"
            element={
              <Suspense fallback={<PageLoader />}>
                <HomeV3 />
              </Suspense>
            }
          />

          {/* ── Public routes ── */}
          <Route
            path="/*"
            element={
              <>
                <CookieConsent />
                <div className="min-h-screen bg-white">
                  <Header />
                  <main>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/"              element={<HomePage />} />
                        <Route path="/about"         element={<AboutPage />} />
                        <Route path="/booking"       element={<BookingPage />} />
                        <Route path="/booking/cancel" element={<BookingCancelPage />} />
                        <Route path="/services"      element={<ServicesPage />} />
                        <Route path="/works"         element={<WorksPage />} />
                        <Route path="/service/:id"   element={<ServiceDetail />} />
                        <Route path="/training"      element={<ComingSoon title="Обучение" />} />
                        <Route path="/shop"          element={<ComingSoon title="Магазин" />} />
                        <Route path="/privacy-policy"    element={<PrivacyPolicy />} />
                        <Route path="/terms-of-service"  element={<TermsOfService />} />
                        <Route path="/cookie-policy"     element={<CookiePolicy />} />
                        <Route path="/legal-notice"      element={<LegalNotice />} />
                      </Routes>
                    </Suspense>
                  </main>
                  <Footer />
                </div>
              </>
            }
          />
        </Routes>
      </BrowserRouter>
    </LangProvider>
  );
}
