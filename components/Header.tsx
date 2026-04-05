"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
    companyId: string;
    currentCompany?: {
      id: string;
      name: string;
      logoDataUrl?: string | null;
    } | null;
    companies?: Array<{
      id: string;
      name: string;
      logoDataUrl?: string | null;
    }>;
  };
};

export function Header() {
  const pathname = usePathname();
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [showCompanySwitcher, setShowCompanySwitcher] = useState(false);
  const [companyName, setCompanyName] = useState("PetShop SaaS");
  const [companyLogoDataUrl, setCompanyLogoDataUrl] = useState<string | null>(null);

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem("petshop_auth_me");
      if (cached) {
        const parsed = JSON.parse(cached) as {
          isSystemAdmin?: boolean;
          companyId?: string;
          companies?: Array<{ id: string; name: string; logoDataUrl?: string | null }>;
        };
        setIsSystemAdmin(Boolean(parsed?.isSystemAdmin));
        const selectedCompany = parsed?.companies?.find((company) => company.id === parsed.companyId);
        if (selectedCompany?.name) {
          setCompanyName(selectedCompany.name);
          setCompanyLogoDataUrl(selectedCompany.logoDataUrl ?? null);
        }
        setShowCompanySwitcher((parsed?.companies?.length ?? 0) > 1);
      }
    } catch {
      // ignora cache inválido
    }

    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload: MeResponse) => {
        setIsSystemAdmin(Boolean(payload.data?.isSystemAdmin));
        const companyFromPayload = payload.data?.currentCompany
          ?? payload.data?.companies?.find((company) => company.id === payload.data?.companyId)
          ?? null;
        if (companyFromPayload?.name) {
          setCompanyName(companyFromPayload.name);
          setCompanyLogoDataUrl(companyFromPayload.logoDataUrl ?? null);
        }
        setShowCompanySwitcher((payload.data?.companies?.length ?? 0) > 1);
      })
      .catch(() => undefined);
  }, []);

  if (pathname === "/login") {
    return null;
  }

  const isAdminArea = isSystemAdmin && pathname.startsWith("/admin/");
  const visibleLinks = links.filter((link) => !(isSystemAdmin && link.href === "/configuracoes"));

  return (
    <header className="header">
      <div className="headerBrand">
        {companyLogoDataUrl ? (
          <span className="headerBrandLogo" aria-hidden="true">
            <Image src={companyLogoDataUrl} alt="" width={88} height={88} unoptimized />
          </span>
        ) : null}
        <h1>{companyName}</h1>
      </div>
      <div>
        <p className="subtle">Agenda, estoque, promoções e avisos</p>
      </div>
      <nav className="nav" aria-label="ações rápidas">
        {!isSystemAdmin && showCompanySwitcher ? (
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
        {isAdminArea ? (
          <Link href="/" className="ghostButton">
            Voltar ao painel inicial
          </Link>
        ) : null}
        <LogoutButton />
      </nav>
    </header>
  );
}
