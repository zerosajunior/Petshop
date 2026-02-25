import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "PetShop SaaS",
  description: "Sistema para petshops com agenda, SMS, promoções e estoque"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <main>
          <Header />
          {children}
          <footer className="appFooter">
            <p>
              Tratamento de dados conforme LGPD. Solicitações do titular:{" "}
              <Link href="/privacidade">Política de Privacidade</Link>.
            </p>
          </footer>
        </main>
      </body>
    </html>
  );
}
