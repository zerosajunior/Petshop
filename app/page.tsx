"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ApiResponse, DashboardData } from "@/types/api";

type StatItem = {
  id: string;
  label: string;
  value: string;
  note: string;
};

export default function HomePage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  useEffect(() => {
    let active = true;

    async function loadMetrics() {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const payload: ApiResponse<DashboardData> = await response.json();

      if (!active || !response.ok || !payload.data) {
        return;
      }

      setDashboard(payload.data);
    }

    loadMetrics().catch(() => undefined);

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

  return (
    <section>
      <div className="menuBoard">
        <article className="menuColumn menuColumnCadastros">
          <h3>Cadastros</h3>
          <Link className="menuButton menuTone1" href="/cadastro">
            Cliente e pet
          </Link>
          <Link className="menuButton menuTone2" href="/servicos">
            Serviços
          </Link>
          <Link className="menuButton menuTone3" href="/estoque">
            Produtos
          </Link>
        </article>

        <article className="menuColumn menuColumnMovimentacoes">
          <h3>Movimentações</h3>
          <Link className="menuButton menuTone1" href="/agenda">
            Agendamentos
          </Link>
          <Link className="menuButton menuTone2" href="/promocoes">
            Campanhas
          </Link>
          <Link className="menuButton menuTone3" href="/estoque">
            Entrada estoque
          </Link>
        </article>

        <article className="menuColumn menuColumnRelatorios">
          <h3>Relatórios</h3>
          <Link className="menuButton menuTone1" href="/relatorios/operacional">
            Operacional do dia
          </Link>
          <Link className="menuButton menuTone2" href="/relatorios/financeiro">
            Financeiro mensal
          </Link>
        </article>
      </div>

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
