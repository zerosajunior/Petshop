"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ApiResponse, DashboardData } from "@/types/api";

type ModuleItem = {
  href: ToolboxHref;
  id: string;
  icon: string;
  title: string;
  value: string;
  note: string;
};

type QuickIndicatorItem = {
  href: ToolboxHref;
  id: string;
  icon: string;
  label: string;
  value: string;
  note: string;
};

type ToolboxHref =
  | "/agenda"
  | "/servicos"
  | "/estoque"
  | "/promocoes"
  | "/relatorios/operacional";

type MeCompany = {
  id: string;
  slug: string;
  name: string;
};

type MeResponse = {
  data?: {
    companyId: string;
    isSystemAdmin: boolean;
    companies: MeCompany[];
  };
};

export default function HomePage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [companies, setCompanies] = useState<MeCompany[]>([]);

  useEffect(() => {
    try {
      const cached = window.localStorage.getItem("petshop_auth_me");
      if (cached) {
        const parsed = JSON.parse(cached) as MeResponse["data"];
        if (parsed) {
          setIsSystemAdmin(Boolean(parsed.isSystemAdmin));
          setCompanyId(parsed.companyId ?? "");
          setCompanies(parsed.companies ?? []);
        }
      }
    } catch {
      // cache inválido não deve bloquear tela inicial
    }

    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload: MeResponse) => {
        if (!payload.data) {
          return;
        }
        setIsSystemAdmin(Boolean(payload.data.isSystemAdmin));
        setCompanyId(payload.data.companyId);
        setCompanies(payload.data.companies ?? []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let active = true;
    if (isSystemAdmin) {
      return () => {
        active = false;
      };
    }

    async function loadMetrics() {
      setLoadError("");

      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const payload: ApiResponse<DashboardData> = await response.json().catch(() => ({}));

      if (!active) {
        return;
      }

      if (response.ok && payload.data) {
        setDashboard(payload.data);
        return;
      }

      // Fallback: carrega métricas por módulos caso /api/dashboard falhe.
      const loadList = async (url: string) => {
        const res = await fetch(url, { cache: "no-store" });
        const body: ApiResponse<unknown[]> = await res.json().catch(() => ({}));
        return res.ok && Array.isArray(body.data) ? body.data : [];
      };

      const [appointments, customers, pets, services, products, campaigns, messages] =
        await Promise.all([
          loadList("/api/appointments"),
          loadList("/api/customers"),
          loadList("/api/pets"),
          loadList("/api/services"),
          loadList("/api/products"),
          loadList("/api/campaigns"),
          loadList("/api/messages")
        ]);

      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const appointmentsTodayItems = appointments
        .filter((item) => {
          const startsAt = new Date(String((item as Record<string, unknown>).startsAt));
          return startsAt >= startOfDay && startsAt <= endOfDay;
        })
        .slice(0, 8)
        .map((item) => item as DashboardData["appointmentsTodayItems"][number]);

      const pendingConfirmations = appointments.filter(
        (item) => String((item as Record<string, unknown>).status) === "SCHEDULED"
      ).length;

      const lowStockProductsItems = products.filter((item) => {
        const row = item as Record<string, unknown>;
        const currentStock = Number(row.currentStock ?? 0);
        const minStock = Number(row.minStock ?? 0);
        return currentStock < minStock;
      }) as DashboardData["lowStockProductsItems"];

      const activeCampaignItems = campaigns.filter((item) => {
        const row = item as Record<string, unknown>;
        const isActive = Boolean(row.isActive);
        const startsAt = new Date(String(row.startsAt));
        const endsAt = new Date(String(row.endsAt));
        return isActive && startsAt <= now && endsAt >= now;
      }) as DashboardData["activeCampaignItems"];

      const smsSentLast24hItems = messages
        .filter((item) => {
          const row = item as Record<string, unknown>;
          const createdAt = new Date(String(row.createdAt));
          return String(row.status) === "SENT" && createdAt >= last24h;
        })
        .slice(0, 8)
        .map((item) => item as DashboardData["smsSentLast24hItems"][number]);

      setDashboard({
        totalAppointments: appointments.length,
        totalCustomers: customers.length,
        totalPets: pets.length,
        totalServices: services.length,
        totalProducts: products.length,
        totalCampaigns: campaigns.length,
        appointmentsToday: appointmentsTodayItems.length,
        appointmentsTodayItems,
        pendingConfirmations,
        smsSentLast24h: smsSentLast24hItems.length,
        smsSentLast24hItems,
        lowStockProducts: lowStockProductsItems.length,
        lowStockProductsItems,
        activeCampaigns: activeCampaignItems.length,
        activeCampaignItems
      });
      setLoadError("Painel em modo de contingência: usando dados diretos dos módulos.");
    }

    loadMetrics().catch(() => {
      if (active) {
        setLoadError("Não foi possível carregar os dados do painel.");
      }
    });

    return () => {
      active = false;
    };
  }, [isSystemAdmin]);

  const stats: QuickIndicatorItem[] = useMemo(() => {
    if (!dashboard) {
      return [
        {
          id: "appointments",
          icon: "📅",
          label: "Agendamentos hoje",
          value: "-",
          note: "Carregando...",
          href: "/agenda"
        },
        {
          id: "sms",
          icon: "📩",
          label: "Avisos enviados",
          value: "-",
          note: "Últimas 24h",
          href: "/relatorios/operacional"
        },
        { id: "stock", icon: "⚠️", label: "Estoque baixo", value: "-", note: "Abaixo do mínimo", href: "/estoque" },
        { id: "campaigns", icon: "🎯", label: "Campanhas ativas", value: "-", note: "Ativas agora", href: "/promocoes" }
      ];
    }

    return [
      {
        id: "appointments",
        icon: "📅",
        label: "Agendamentos hoje",
        value: String(dashboard.appointmentsToday),
        note: `${dashboard.pendingConfirmations} confirmações pendentes`,
        href: "/agenda"
      },
      {
        id: "sms",
        icon: "📩",
        label: "Avisos enviados",
        value: String(dashboard.smsSentLast24h),
        note: "Últimas 24h",
        href: "/relatorios/operacional"
      },
      {
        id: "stock",
        icon: "⚠️",
        label: "Estoque baixo",
        value: String(dashboard.lowStockProducts),
        note: "Abaixo do mínimo",
        href: "/estoque"
      },
      {
        id: "campaigns",
        icon: "🎯",
        label: "Campanhas ativas",
        value: String(dashboard.activeCampaigns),
        note: "Ativas agora",
        href: "/promocoes"
      }
    ];
  }, [dashboard]);

  const modules: ModuleItem[] = useMemo(() => {
    if (!dashboard) {
      return [
        {
          id: "appointments",
          icon: "📆",
          title: "Agendamentos",
          value: "-",
          note: "carregando",
          href: "/agenda"
        },
        {
          id: "services",
          icon: "✂️",
          title: "Serviços",
          value: "-",
          note: "carregando",
          href: "/servicos"
        },
        {
          id: "products",
          icon: "🧴",
          title: "Produtos",
          value: "-",
          note: "carregando",
          href: "/estoque"
        },
        {
          id: "campaigns",
          icon: "📣",
          title: "Campanhas",
          value: "-",
          note: "carregando",
          href: "/promocoes"
        }
      ];
    }

    return [
      {
        id: "appointments",
        icon: "📆",
        title: "Agendamentos",
        value: String(dashboard.totalAppointments),
        note: `${dashboard.appointmentsToday} hoje`,
        href: "/agenda"
      },
      {
        id: "services",
        icon: "✂️",
        title: "Serviços",
        value: String(dashboard.totalServices),
        note: "ativos",
        href: "/servicos"
      },
      {
        id: "products",
        icon: "🧴",
        title: "Produtos",
        value: String(dashboard.totalProducts),
        note: `${dashboard.lowStockProducts} com baixo estoque`,
        href: "/estoque"
      },
      {
        id: "campaigns",
        icon: "📣",
        title: "Campanhas",
        value: String(dashboard.totalCampaigns),
        note: `${dashboard.activeCampaigns} ativas`,
        href: "/promocoes"
      }
    ];
  }, [dashboard]);

  if (isSystemAdmin) {
    const currentCompany = companies.find((company) => company.id === companyId) ?? null;
    const otherCompanies = companies.filter((company) => company.id !== companyId);

    return (
      <section>
        <article className="panel adminHubPanel">
          <h2>Hub do administrador</h2>
          <div className="adminHubActions">
            <Link className="adminHubButton adminHubPrimary" href="/admin/sistema">
              Administração do Sistema
            </Link>
            <Link className="adminHubButton adminHubSecondary" href="/agenda">
              {currentCompany ? `Sistema - ${currentCompany.name}` : "Sistema"}
            </Link>
            {otherCompanies.map((company) => (
              <Link
                key={company.id}
                className="adminHubButton adminHubCompanyAction"
                href={`/${company.slug}/agenda`}
              >
                {company.name}
              </Link>
            ))}
          </div>
          {companies.length === 0 ? (
            <small className="subtle">Nenhuma empresa ativa disponível.</small>
          ) : null}
        </article>
      </section>
    );
  }

  return (
    <section>
      <article className="panel">
        <h3>Resumo rápido</h3>
        {loadError ? <small style={{ color: "#b42318" }}>{loadError}</small> : null}
        <div className="categoryToolboxCards">
          {modules.map((module) => (
            <Link className="categoryToolboxCard" key={`summary-${module.id}`} href={module.href}>
              <span className="categoryToolboxTopLine">
                <span className="categoryToolboxIcon">{module.icon}</span>
                <span className="categoryToolboxLabel">{module.title}</span>
              </span>
              <span className="categoryToolboxBottomLine">
                <small className="subtle">{module.note}</small>
                <strong>{module.value}</strong>
              </span>
            </Link>
          ))}
        </div>
      </article>

      <article className="panel">
        <h3>Indicadores rápidos</h3>
        <div className="categoryToolboxCards">
          {stats.map((stat) => (
            <Link className="categoryToolboxCard" key={stat.id} href={stat.href}>
              <span className="categoryToolboxTopLine">
                <span className="categoryToolboxIcon">{stat.icon}</span>
                <span className="categoryToolboxLabel">{stat.label}</span>
              </span>
              <span className="categoryToolboxBottomLine">
                <small className="subtle">{stat.note}</small>
                <strong>{stat.value}</strong>
              </span>
            </Link>
          ))}
        </div>
      </article>
    </section>
  );
}
