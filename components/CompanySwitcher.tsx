"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type CompanyItem = {
  id: string;
  slug: string;
  name: string;
  logoDataUrl?: string | null;
};

type MeResponse = {
  data?: {
    companyId: string;
    isSystemAdmin: boolean;
    companies: CompanyItem[];
  };
};

export function CompanySwitcher() {
  const pathname = usePathname();
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem("petshop_auth_me");
      if (cached) {
        const parsed = JSON.parse(cached) as MeResponse["data"];
        if (parsed) {
          setCompanies(parsed.companies ?? []);
          setCompanyId(parsed.companyId ?? "");
          setIsSystemAdmin(Boolean(parsed.isSystemAdmin));
        }
      }
    } catch {
      // ignora cache inválido
    }

    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload: MeResponse) => {
        if (!payload.data) {
          return;
        }
        setCompanies(payload.data.companies ?? []);
        setCompanyId(payload.data.companyId);
        setIsSystemAdmin(Boolean(payload.data.isSystemAdmin));
        try {
          window.localStorage.setItem("petshop_auth_me", JSON.stringify(payload.data));
        } catch {
          // falha de storage não deve quebrar UX
        }
      })
      .catch(() => undefined);
  }, []);

  async function switchCompany(nextCompanyId: string) {
    if (!nextCompanyId || nextCompanyId === companyId || loading) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/switch-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: nextCompanyId })
      });

      if (!response.ok) {
        setLoading(false);
        return;
      }

      setCompanyId(nextCompanyId);
      window.location.reload();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="companySwitcher">
      {companies.length > 1 ? (
        <select
          value={companyId}
          onChange={(event) => switchCompany(event.target.value)}
          disabled={loading}
          aria-label="Selecionar empresa"
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      ) : null}

      {isSystemAdmin ? (
        <Link
          href="/admin/sistema"
          className={`companyAdminLink${pathname === "/admin/sistema" ? " isActive" : ""}`}
          aria-current={pathname === "/admin/sistema" ? "page" : undefined}
        >
          Painel Admin
        </Link>
      ) : null}
    </div>
  );
}
