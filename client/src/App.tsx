import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { PropertyGrid } from "./components/PropertyGrid";
import { Footer } from "./components/Footer";
import { LoginPage } from "./components/LoginPage";
import { RegisterPage } from "./components/RegisterPage";
import { mockListings } from "./data/mockListings.js";
import { Routes, Route } from "react-router-dom";

function HomePage() {
  return (
    <>
      <Hero />
      <PropertyGrid listings={mockListings} />
    </>
  )
}

export default function App() {
  // TODO: Implement current user states

  return (
    <div className="antialiased min-h-screen flex flex-col font-body-md text-body-md bg-background text-on-background">

      <Navbar />

      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />}></Route>
          <Route path="/login" element={<LoginPage />}></Route>
          <Route path="/register" element={<RegisterPage />}></Route>
        </Routes>
      </main>

      <Footer />
    </div>
  );
}