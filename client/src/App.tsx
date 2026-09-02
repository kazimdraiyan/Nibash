import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { PropertyGrid } from "./components/PropertyGrid";
import { HowItWorks } from "./components/HowItWorks";
import { PopularLocations } from "./components/PopularLocations";
import { WhyChooseUs } from "./components/WhyChooseUs";
import { CallToAction } from "./components/CallToAction";
import { Footer } from "./components/Footer";
import { LoginPage } from "./components/LoginPage";
import { RegisterPage } from "./components/RegisterPage";
import { RoleOnboardingPage } from "./pages/RoleOnboardingPage";
import { ListingsPage } from "./pages/ListingsPage";
import { ListingDetailPage } from "./pages/ListingDetailPage";
import { ListingFormPage } from "./pages/ListingFormPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { ContractFormPage } from "./pages/ContractFormPage";
import { ContractDetailPage } from "./pages/ContractDetailPage";
import { mockListings } from "./data/mockListings";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

function HomePage() {
  return (
    <>
      <Hero />
      <PropertyGrid listings={mockListings} />
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
          Loading Nibash Residences...
        </span>
      </div>
    );
  }

  return (
    <div className="antialiased min-h-screen flex flex-col bg-[#090a0c] text-[#f8f9fa]">
      <Navbar />

      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/onboarding" element={<RoleOnboardingPage />} />
          <Route path="/listings" element={<ListingsPage />} />
          <Route path="/listings/new" element={<ListingFormPage />} />
          <Route path="/listings/:id" element={<ListingDetailPage />} />
          <Route path="/listings/:id/edit" element={<ListingFormPage />} />
          <Route path="/owner/applications" element={<ApplicationsPage />} />
          <Route path="/contracts/new" element={<ContractFormPage />} />
          <Route path="/contracts/:id" element={<ContractDetailPage />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

