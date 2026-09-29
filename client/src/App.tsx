import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { PopularLocations } from "./components/PopularLocations";
import { WhyChooseUs } from "./components/WhyChooseUs";
import { CallToAction } from "./components/CallToAction";
import { Footer } from "./components/Footer";
import { LoginPage } from "./components/LoginPage";
import { RegisterPage } from "./components/RegisterPage";
import { ListingsPage } from "./pages/ListingsPage";
import { MyListingsPage } from "./pages/MyListingsPage";
import { ListingDetailPage } from "./pages/ListingDetailPage";
import { ListingFormPage } from "./pages/ListingFormPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { MyApplicationsPage } from "./pages/MyApplicationsPage";
import { ContractFormPage } from "./pages/ContractFormPage";
import { ContractDetailPage } from "./pages/ContractDetailPage";
import { MyContractPage } from "./pages/MyContractPage";
import { StarredListingsPage } from "./pages/StarredListingsPage";
import { ScrollToTop } from "./components/ScrollToTop";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ActualListings } from "./components/ActualListings";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { VerifyPortalPage } from "./pages/VerifyPortalPage";
import { VerifierDashboardPage } from "./pages/VerifierDashboardPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";

function HomePage() {
  const { user } = useAuth();

  if (user?.is_verifier) {
    return <Navigate to="/verify/dashboard" replace />;
  }

  return (
    <>
      <Hero />
      <ActualListings />
      <div id="how-it-works">
        <HowItWorks />
      </div>
      <div id="locations">
        <PopularLocations />
      </div>
      <div id="why-us">
        <WhyChooseUs />
      </div>
      <CallToAction />
    </>
  );
}

export default function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#090a0c] text-white">
        <div className="w-12 h-12 rounded-full border-2 border-white/60 border-t-transparent animate-spin mb-4" />
        <span className="text-xs uppercase tracking-[0.25em] text-[#cbd5e1] font-label-sm">
          Loading Nibash Apartments...
        </span>
      </div>
    );
  }



  return (
    <div className="antialiased min-h-screen flex flex-col bg-[#090a0c] text-[#f8f9fa]">
      <ScrollToTop />
      <Navbar />

      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyPortalPage />} />
          <Route
            path="/verify/dashboard"
            element={
              <ProtectedRoute>
                <VerifierDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />
          <Route path="/listings" element={<ListingsPage />} />
          <Route
            path="/my-listings"
            element={
              <ProtectedRoute blockVerifier>
                <MyListingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/listings/new"
            element={
              <ProtectedRoute blockVerifier>
                <ListingFormPage />
              </ProtectedRoute>
            }
          />
          <Route path="/listings/:id" element={<ListingDetailPage />} />
          <Route
            path="/listings/:id/edit"
            element={
              <ProtectedRoute blockVerifier>
                <ListingFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-applications"
            element={
              <ProtectedRoute blockVerifier>
                <MyApplicationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/applications"
            element={
              <ProtectedRoute blockVerifier>
                <ApplicationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts/new"
            element={
              <ProtectedRoute blockVerifier>
                <ContractFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-contract"
            element={
              <ProtectedRoute blockVerifier>
                <MyContractPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/contracts/:id"
            element={
              <ProtectedRoute>
                <ContractDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/starred"
            element={
              <ProtectedRoute blockVerifier>
                <StarredListingsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}
