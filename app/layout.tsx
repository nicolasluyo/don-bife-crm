import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Los Postres de Patty CRM — Agente IA",
  description: "Panel de gestión de conversaciones y reservas de Los Postres de Patty — Pastelería y cafetería en Real Plaza Piura",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-stone-50 text-stone-900`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
