"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ApiResponse } from "@/types/api";

type ReportsData = {
  projectedRevenueTodayCents: number;
  realizedRevenueMonthCents: number;
  averageTicketMonthCents: number;
  stockValueCents: number;
  topServicesMonth: Array<{ serviceName: string; completed: number }>;
};

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export default function RelatoriosFinanceiroPage() {
  const [data, setData] = useState<ReportsData | null>(null);

  useEffect(() => {
    async function loadReports() {
      const response = await fetch("/api/reports", { cache: "no-store" });
      const payload: ApiResponse<ReportsData> = await response.json();

      if (!response.ok || !payload.data) {
        return;
      }

      setData(payload.data);
    }

    loadReports().catch(() => undefined);
  }, []);

  return (
    <section>
      <h2>Relatório financeiro</h2>
      <p className="subtle">Visão de receita, ticket e valor de estoque.</p>

      <article className="panel">
        <div className="pageActions">
          <Link className="btnPrimary" href="/relatorios/operacional">
            Ver operacional
          </Link>
          <Link className="btnSecondary" href="/">
            Voltar ao painel
          </Link>
        </div>

        <div className="statsGrid">
          <article className="statCard">
            <p className="subtle">Receita prevista hoje</p>
            <div className="metric">{data ? formatBRL(data.projectedRevenueTodayCents) : "-"}</div>
            <small className="subtle">Agendamentos do dia (exceto cancelados)</small>
          </article>
          <article className="statCard">
            <p className="subtle">Receita realizada no mês</p>
            <div className="metric">{data ? formatBRL(data.realizedRevenueMonthCents) : "-"}</div>
            <small className="subtle">Somente agendamentos concluídos</small>
          </article>
          <article className="statCard">
            <p className="subtle">Ticket médio no mês</p>
            <div className="metric">{data ? formatBRL(data.averageTicketMonthCents) : "-"}</div>
            <small className="subtle">Baseado em serviços concluídos</small>
          </article>
          <article className="statCard">
            <p className="subtle">Valor estimado em estoque</p>
            <div className="metric">{data ? formatBRL(data.stockValueCents) : "-"}</div>
            <small className="subtle">Estoque atual x preço de venda</small>
          </article>
        </div>
      </article>

      <article className="panel">
        <h3>Top serviços no mês</h3>
        <ul className="listSimple">
          {(data?.topServicesMonth ?? []).map((item) => (
            <li key={item.serviceName}>
              {item.serviceName} - {item.completed} concluídos
            </li>
          ))}
          {data && data.topServicesMonth.length === 0 ? (
            <li className="subtle">Sem serviços concluídos no mês.</li>
          ) : null}
        </ul>
      </article>
    </section>
  );
}
