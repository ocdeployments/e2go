"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/learn", label: "Learn" },
  { href: "/pricing", label: "Pricing" },
  { href: "/simulator", label: "Simulator" },
];

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav
      className="sticky top-0 z-50"
      style={{
        background: "rgba(10,10,10,0.95)",
        borderBottom: "1px solid rgba(201,168,76,0.1)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <span className="font-display text-2xl md:text-3xl font-light text-[#f5f0e8] tracking-wide">
              e2go
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-sans text-sm transition-colors duration-200"
                style={{ color: "rgba(245,240,232,0.75)" }}
                onMouseEnter={e => e.currentTarget.style.color = "#f5f0e8"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(245,240,232,0.75)"}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/login"
              className="font-sans text-sm transition-colors duration-200"
              style={{ color: "rgba(245,240,232,0.55)" }}
              onMouseEnter={e => e.currentTarget.style.color = "#f5f0e8"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(245,240,232,0.55)"}
            >
              Log in
            </Link>
            <Link
              href="/quiz"
              className="font-sans text-sm transition-colors duration-200"
              style={{
                padding: "8px 18px",
                border: "1px solid rgba(201,168,76,0.5)",
                color: "#C9A84C",
                fontSize: "11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: "transparent",
                borderRadius: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "#C9A84C"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)"}
            >
              Check eligibility
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            <svg
              className="w-6 h-6 text-[#f5f0e8]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div
          className="px-4 py-4 border-t border-[rgba(201,168,76,0.1)]"
          style={{ background: "rgba(10,10,10,0.98)" }}
        >
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-sans text-base py-3 transition-colors duration-200"
                style={{ color: "rgba(245,240,232,0.75)" }}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="font-sans text-base py-3 transition-colors duration-200"
              style={{ color: "rgba(245,240,232,0.55)" }}
              onClick={() => setIsOpen(false)}
            >
              Log in
            </Link>
            <Link
              href="/quiz"
              className="font-sans text-base py-3 text-center transition-colors duration-200"
              style={{
                padding: "8px 18px",
                border: "1px solid rgba(201,168,76,0.5)",
                color: "#C9A84C",
                fontSize: "11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: "transparent",
                borderRadius: 0,
                marginTop: "4px",
              }}
              onClick={() => setIsOpen(false)}
            >
              Check eligibility
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
