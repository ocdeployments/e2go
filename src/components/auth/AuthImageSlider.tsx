"use client";

import { useState, useEffect } from "react";

const IMAGES = [
  // New York City / Business skyline
  "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=2070&auto=format&fit=crop",
  // Professional business meeting / handshake
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1932&auto=format&fit=crop",
  // Washington D.C. / American landmark architecture
  "https://images.unsplash.com/photo-1541971892-c92eb4c61147?q=80&w=2070&auto=format&fit=crop",
  // Modern U.S. business environment
  "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop",
];

export default function AuthImageSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % IMAGES.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0a0a] hidden md:block">
      {IMAGES.map((src, index) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{
            opacity: index === currentIndex ? 1 : 0,
          }}
        >
          <img
            src={src}
            alt="U.S. business and landmark environment"
            className="w-full h-full object-cover opacity-50"
          />
          {/* Subtle Gold Gradient Overlay for Obsidian Gold aesthetic */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
        </div>
      ))}

      {/* Ambient Message Overlay */}
      <div className="absolute bottom-16 left-12 max-w-md hidden lg:block">
        <h2 className="text-4xl font-light mb-4 leading-tight" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif" }}>
          Your U.S. Business Journey Starts Here.
        </h2>
        <p className="text-base leading-relaxed" style={{ color: "rgba(245,240,232,0.6)", fontFamily: "'DM Sans', sans-serif" }}>
          Professional-grade E-2 visa preparation, built for global applicants.
        </p>
      </div>
    </div>
  );
}
