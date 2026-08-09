import type { Metadata } from "next";
import ServisSorgulaClient from "./ServisSorgulaClient";

export const metadata: Metadata = {
  title: "Servis Sorgula | Servis Takip",
  description: "Servis numarası ve telefon ile servis durumunu sorgulayın.",
};

export default function ServisSorgulaPage() {
  return <ServisSorgulaClient />;
}
