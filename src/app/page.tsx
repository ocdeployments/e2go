import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "e2go — U.S. E-2 Treaty Investor Visa Preparation",
  description:
    "Prepare your complete E-2 visa application package without an immigration attorney. All 11 consulate tabs. 82 treaty countries. From $297.",
};

export default function Home() {
  return <HomeClient content={null} />;
}
