"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ApiResponse } from "@/types/api";

type ReportsData = {
  completedCountMonth: number;
  scheduledCountToday: number;
  sentMessages24h: number;
  activeCampaigns: number;
};

export default function RelatoriosOperacionalPage() {
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
      <h2>Relatório operacional</h2>
      <p className="subtle">Acompanhamento diário da operação do pet shop.</p>

      <article className="panel">
        <div className="pageActions">
          <Link className="btnPrimary" href="/relatorios/financeiro">
            Ver financeiro
          </Link>
          <Link className="btnSecondary" href="/">
            Voltar ao painel
          </Link>
        </div>

        <div className="statsGrid">
          <article className="statCard">
            <p className="subtle">Agendamentos válidos hoje</p>
            <div className="metric">{data ? String(data.scheduledCountToday) : "-"}</div>
            <small className="subtle">Programados para hoje</small>
          </article>
          <article className="statCard">
            <p className="subtle">Mensagens enviadas (24h)</p>
            <div className="metric">{data ? String(data.sentMessages24h) : "-"}</div>
            <small className="subtle">SMS/WhatsApp com status enviado</small>
          </article>
          <article className="statCard">
            <p className="subtle">Campanhas ativas</p>
            <div className="metric">{data ? String(data.activeCampaigns) : "-"}</div>
            <small className="subtle">No período atual</small>
          </article>
          <article className="statCard">
            <p className="subtle">Serviços concluídos no mês</p>
            <div className="metric">{data ? String(data.completedCountMonth) : "-"}</div>
            <small className="subtle">Volume operacional</small>
          </article>
        </div>
      </article>
    </section>
  );
}
