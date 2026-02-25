"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiResponse, DashboardData } from "@/types/api";

type StatItem = {
  id: string;
  label: string;
  value: string;
  note: string;
};

type ModuleItem = {
  id: string;
  title: string;
  value: string;
  note: string;
};

export default function HomePage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

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
  }, []);

  const stats: StatItem[] = useMemo(() => {
    if (!dashboard) {
      return [
        { id: "appointments", label: "Agendamentos hoje", value: "-", note: "Carregando..." },
        { id: "sms", label: "Avisos enviados", value: "-", note: "Últimas 24h" },
        { id: "stock", label: "Estoque baixo", value: "-", note: "Abaixo do mínimo" },
        { id: "campaigns", label: "Campanhas ativas", value: "-", note: "Ativas agora" }
      ];
    }

    return [
      {
        id: "appointments",
        label: "Agendamentos hoje",
        value: String(dashboard.appointmentsToday),
        note: `${dashboard.pendingConfirmations} confirmações pendentes`
      },
      {
        id: "sms",
        label: "Avisos enviados",
        value: String(dashboard.smsSentLast24h),
        note: "Últimas 24h"
      },
      {
        id: "stock",
        label: "Estoque baixo",
        value: String(dashboard.lowStockProducts),
        note: "Abaixo do mínimo"
      },
      {
        id: "campaigns",
        label: "Campanhas ativas",
        value: String(dashboard.activeCampaigns),
        note: "Ativas agora"
      }
    ];
  }, [dashboard]);

  const modules: ModuleItem[] = useMemo(() => {
    if (!dashboard) {
      return [
        {
          id: "appointments",
          title: "Agendamentos",
          value: "-",
          note: "carregando"
        },
        {
          id: "cadastros",
          title: "Cadastros",
          value: "-",
          note: "carregando"
        },
        {
          id: "services",
          title: "Serviços",
          value: "-",
          note: "carregando"
        },
        {
          id: "products",
          title: "Produtos",
          value: "-",
          note: "carregando"
        },
        {
          id: "campaigns",
          title: "Campanhas",
          value: "-",
          note: "carregando"
        }
      ];
    }

    return [
      {
        id: "appointments",
        title: "Agendamentos",
        value: String(dashboard.totalAppointments),
        note: `${dashboard.appointmentsToday} hoje`
      },
      {
        id: "cadastros",
        title: "Cadastros",
        value: String(dashboard.totalCustomers),
        note: `${dashboard.totalPets} pets`
      },
      {
        id: "services",
        title: "Serviços",
        value: String(dashboard.totalServices),
        note: "ativos"
      },
      {
        id: "products",
        title: "Produtos",
        value: String(dashboard.totalProducts),
        note: `${dashboard.lowStockProducts} com baixo estoque`
      },
      {
        id: "campaigns",
        title: "Campanhas",
        value: String(dashboard.totalCampaigns),
        note: `${dashboard.activeCampaigns} ativas`
      }
    ];
  }, [dashboard]);

  return (
    <section>
      <article className="panel">
        <h3>Resumo rápido</h3>
        {loadError ? <small style={{ color: "#b42318" }}>{loadError}</small> : null}
        <div className="compactSummaryRow">
          {modules.map((module) => (
            <article className="compactSummaryItem" key={`summary-${module.id}`}>
              <strong>{module.title}</strong>
              <span className="compactSummaryValue">{module.value}</span>
              <small className="subtle">{module.note}</small>
            </article>
          ))}
        </div>
      </article>

      <article className="panel">
        <h3>Indicadores rápidos</h3>
        <div className="statsGrid">
          {stats.map((stat) => (
            <article className="statCard" key={stat.id}>
              <p className="subtle">{stat.label}</p>
              <div className="metric">{stat.value}</div>
              <small className="subtle">{stat.note}</small>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}
