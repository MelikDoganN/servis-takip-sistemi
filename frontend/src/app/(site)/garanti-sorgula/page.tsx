import type { Metadata } from "next";
import GarantiSorgulaClient from "./GarantiSorgulaClient";

export const metadata: Metadata = {
  title: "Garanti Sorgula | Servis Takip",
  description: "Seri numarası ile cihaz garanti durumunu sorgulayın.",
};

export default function GarantiSorgulaPage() {
  return <GarantiSorgulaClient />;
}
