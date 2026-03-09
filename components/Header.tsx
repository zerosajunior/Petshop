"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { usePathname } from "next/navigation";
import { CompanySwitcher } from "@/components/CompanySwitcher";

type NavLink = {
  href:
    | "/"
    | "/agenda"
    | "/estoque"
    | "/movimentacoes-estoque"
    | "/promocoes"
    | "/relatorios"
    | "/privacidade"
    | "/configuracoes";
  label: string;
};

const links: NavLink[] = [
  { href: "/", label: "Painel inicial" },
  { href: "/agenda", label: "Agendamentos" },
  { href: "/estoque", label: "Produtos" },
  { href: "/movimentacoes-estoque", label: "Estoque" },
  { href: "/relatorios", label: "Relatórios" },
  { href: "/promocoes", label: "Campanhas" },
  { href: "/configuracoes", label: "Configurações" },
  { href: "/privacidade", label: "Privacidade" }
];

export function Header() {
  const pathname = usePathname();

  if (pathname === "/login") {
    return null;
  }

  return (
    <header className="header">
      <div>
        <h1>PetShop SaaS</h1>
        <p className="subtle">Agenda, estoque, promoções e avisos por SMS</p>
      </div>
      <nav className="nav" aria-label="ações rápidas">
        <CompanySwitcher />
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
        <LogoutButton />
      </nav>
    </header>
  );
}
