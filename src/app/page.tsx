import HomeClient from "./HomeClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "E2go — U.S. E-2 Treaty Investor Visa Preparation",
  description: "Prepare your complete E-2 visa application package. All consulate tabs. 82 treaty countries. From $550.",
};

export default function Home() {
  return <HomeClient />;
}
