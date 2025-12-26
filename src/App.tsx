import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { NotificationPrompt } from "@/components/pwa/NotificationPrompt";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { SubscriptionProvider } from "@/hooks/useSubscription";
import { TrialWarningBanner } from "@/components/subscription/Paywall";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import BookingFlow from "./pages/BookingFlow";
import PublicSalon from "./pages/PublicSalon";
import NotFound from "./pages/NotFound";
import Install from "./pages/Install";
import Checkout from "./pages/Checkout";
import PublicBookingAdvanced from "./pages/PublicBookingAdvanced";

// Lazy loaded Public Pages
const PublicWaitlist = lazy(() => import("./pages/PublicWaitlist"));
const RatingPage = lazy(() => import("./pages/RatingPage"));

// Lazy loaded Admin Pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const SalonSettings = lazy(() => import("./pages/admin/SalonSettings"));
const Professionals = lazy(() => import("./pages/admin/Professionals"));
const Services = lazy(() => import("./pages/admin/Services"));
const Coupons = lazy(() => import("./pages/admin/Coupons"));
const Appointments = lazy(() => import("./pages/admin/Appointments"));
const Clients = lazy(() => import("./pages/admin/Clients"));
const Financial = lazy(() => import("./pages/admin/Financial"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const Packages = lazy(() => import("./pages/admin/Packages"));
const Products = lazy(() => import("./pages/admin/Products"));
const Reviews = lazy(() => import("./pages/admin/Reviews"));
const MultiUnits = lazy(() => import("./pages/admin/MultiUnits"));
const Gallery = lazy(() => import("./pages/admin/Gallery"));
const AdvancedFeatures = lazy(() => import("./pages/admin/AdvancedFeatures"));
const SubscriptionManagement = lazy(() => import("./pages/admin/SubscriptionManagement"));
const Marketing = lazy(() => import("./pages/admin/Marketing"));

// Lazy loaded Professional Pages
const ProfessionalDashboard = lazy(() => import("./pages/professional/ProfessionalDashboard"));

// Lazy loaded Client Pages
const ClientProfile = lazy(() => import("./pages/client/ClientProfile"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <InstallPrompt />
      <OfflineIndicator />
      <NotificationPrompt />
      <BrowserRouter>
        <AuthProvider>
          <SubscriptionProvider>
            <TrialWarningBanner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/install" element={<Install />} />
              <Route path="/booking" element={<BookingFlow />} />
              <Route path="/booking/:salonId" element={<BookingFlow />} />

              {/* Public Salon Booking by Slug */}
              <Route path="/s/:slug" element={<PublicSalon />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/agendar" element={<PublicBookingAdvanced />} />
              <Route path="/agendar/:salonSlug" element={<PublicBookingAdvanced />} />
              <Route path="/avaliar/:appointmentId" element={<Suspense fallback={<LoadingScreen />}><RatingPage /></Suspense>} />

              {/* Public Waitlist */}
              <Route path="/waitlist/:salonId" element={
                <Suspense fallback={<LoadingScreen />}>
                  <PublicWaitlist />
                </Suspense>
              } />

              {/* Legacy dashboard redirect */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Navigate to="/admin" replace />
                </ProtectedRoute>
              } />

              {/* Admin Routes */}
              <Route path="/admin" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <AdminDashboard />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <SalonSettings />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/professionals" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <Professionals />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/services" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <Services />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/coupons" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <Coupons />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/appointments" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <Appointments />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/clients" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <Clients />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/financial" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <Financial />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/analytics" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <Analytics />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/packages" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <Packages />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/products" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <Products />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/reviews" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <Reviews />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/multi-units" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <MultiUnits />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/gallery" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <Gallery />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/advanced" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <AdvancedFeatures />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/subscription" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <SubscriptionManagement />
                  </Suspense>
                </ProtectedRoute>
              } />
              <Route path="/admin/marketing" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <Marketing />
                  </Suspense>
                </ProtectedRoute>
              } />

              {/* Professional Routes */}
              <Route path="/professional" element={
                <ProtectedRoute requiredRole="professional">
                  <Suspense fallback={<LoadingScreen />}>
                    <ProfessionalDashboard />
                  </Suspense>
                </ProtectedRoute>
              } />

              {/* Client Routes */}
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingScreen />}>
                    <ClientProfile />
                  </Suspense>
                </ProtectedRoute>
              } />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </SubscriptionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
