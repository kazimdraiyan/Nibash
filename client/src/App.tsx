import { useState } from "react";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { PropertyGrid } from "./components/PropertyGrid";
import { Footer } from "./components/Footer";
import { LoginPage } from "./components/LoginPage";
import { RegisterPage } from "./components/RegisterPage";
import { mockListings } from "./data/mockListings.js";

export default function App() {
  const [currentView, setCurrentView] = useState<"home" | "login" | "register">("home");
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null);

  const handleNavigate = (view: "home" | "login" | "register") => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLoginSuccess = (data: { email: string; token: string }) => {
    setCurrentUser({ email: data.email });
    // After successful login, navigate back to home
    setTimeout(() => {
      setCurrentView("home");
    }, 1000);
  };

  const handleRegisterSuccess = (_data: { email: string }) => {
    setCurrentView("login");
  };

  return (
    <div className="antialiased min-h-screen flex flex-col font-body-md text-body-md bg-background text-on-background">
    
      <Navbar currentView={currentView} onNavigate={handleNavigate} />

      {/* // TODO: Replace with proper routing */}
      <main className="flex-grow">
        {currentView === "home" && (
          <>
            <Hero />
            <PropertyGrid listings={mockListings} />
          </>
        )}
        {currentView === "login" && (
          <LoginPage
            onNavigate={handleNavigate}
            onLoginSuccess={handleLoginSuccess}
          />
        )}
        {currentView === "register" && (
          <RegisterPage
            onNavigate={handleNavigate}
            onRegisterSuccess={handleRegisterSuccess}
          />
        )}
      </main>

      {/* Shared Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}