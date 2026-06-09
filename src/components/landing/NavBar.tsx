"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/quiz", label: "Quiz" },
  { href: "/learn", label: "Learn" },
  { href: "/support", label: "Support" },
];

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-[rgba(201,168,76,0.1)]">
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
                className="font-sans text-sm text-[rgba(245,240,232,0.7)] hover:text-[#C9A84C] transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="/login"
              className="font-sans text-sm text-[#f5f0e8] px-5 py-2.5 border border-[rgba(201,168,76,0.3)] hover:border-[#C9A84C] transition-colors duration-200"
            >
              Log in
            </Link>
            <Link
              href="/quiz"
              className="font-sans text-sm text-[#0a0a0a] bg-[#C9A84C] px-5 py-2.5 hover:bg-[#d4b85f] transition-colors duration-200"
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
        <div className="px-4 py-4 bg-[#0a0a0a] border-t border-[rgba(201,168,76,0.1)]">
          <div className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-sans text-base text-[rgba(245,240,232,0.7)] py-3 hover:text-[#C9A84C] transition-colors duration-200"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 flex flex-col space-y-3">
              <Link
                href="/login"
                className="font-sans text-base text-[#f5f0e8] py-3 text-center border border-[rgba(201,168,76,0.3)] hover:border-[#C9A84C] transition-colors duration-200"
                onClick={() => setIsOpen(false)}
              >
                Log in
              </Link>
              <Link
                href="/quiz"
                className="font-sans text-base text-[#0a0a0a] bg-[#C9A84C] py-3 text-center hover:bg-[#d4b85f] transition-colors duration-200"
                onClick={() => setIsOpen(false)}
              >
                Check eligibility
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}