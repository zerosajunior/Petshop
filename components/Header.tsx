"use client";

import { useEffect, useState } from "react";
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

type MeResponse = {
  data?: {
    isSystemAdmin: boolean;
  };
};

export function Header() {
  const pathname = usePathname();
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem("petshop_auth_me");
      if (cached) {
        const parsed = JSON.parse(cached) as { isSystemAdmin?: boolean };
        setIsSystemAdmin(Boolean(parsed?.isSystemAdmin));
      }
    } catch {
      // ignora cache inválido
    }

    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload: MeResponse) => {
        setIsSystemAdmin(Boolean(payload.data?.isSystemAdmin));
      })
      .catch(() => undefined);
  }, []);

  if (pathname === "/login") {
    return null;
  }

  const isAdminArea = isSystemAdmin && (pathname === "/" || pathname.startsWith("/admin/"));
  const visibleLinks = links.filter((link) => !(isSystemAdmin && link.href === "/configuracoes"));

  return (
    <header className="header">
      <div>
        <h1>PetShop SaaS</h1>
        <p className="subtle">Agenda, estoque, promoções e avisos por SMS</p>
      </div>
      <nav className="nav" aria-label="ações rápidas">
        {!isSystemAdmin ? (
          <div className="navAdminGroup">
            <CompanySwitcher />
          </div>
        ) : null}
        {!isAdminArea ? (
          <div className="navMainGroup">
            {visibleLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
        <LogoutButton />
      </nav>
    </header>
  );
}
