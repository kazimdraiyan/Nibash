import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { PropertyGrid } from "./components/PropertyGrid";
import { Footer } from "./components/Footer";
import { mockListings } from "./data/mockListings.js";

export default function App() {
  return (
    <div className="antialiased min-h-screen flex flex-col font-body-md text-body-md">
      <Navbar />
      <main className="flex-grow">
        <Hero />
        <PropertyGrid listings={mockListings} />
      </main>
      <Footer />
    </div>
  );
}