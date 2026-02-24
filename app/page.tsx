"use client";

import { useEffect, useMemo, useState } from "react";
import type { ApiResponse, DashboardData } from "@/types/api";

type CardId = "appointments" | "sms" | "stock" | "campaigns";

type Card = {
  id: CardId;
  title: string;
  value: string;
  note: string;
};

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function renderDetails(cardId: CardId, data: DashboardData) {
  if (cardId === "appointments") {
    return (
      <>
        {data.appointmentsTodayItems.length === 0 ? (
          <p className="subtle">Nenhum agendamento para hoje.</p>
        ) : (
          <ul className="detailList">
            {data.appointmentsTodayItems.map((item) => (
              <li className="detailItem" key={item.id}>
                <strong>{item.petName}</strong> ({item.customerName}) - {item.serviceName}
                <br />
                <small className="subtle">
                  {formatDateTime(item.startsAt)} - {item.status}
                </small>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  if (cardId === "sms") {
    return (
      <>
        {data.smsSentLast24hItems.length === 0 ? (
          <p className="subtle">Nenhum aviso enviado nas últimas 24h.</p>
        ) : (
          <ul className="detailList">
            {data.smsSentLast24hItems.map((item) => (
              <li className="detailItem" key={item.id}>
                <strong>{item.channel}</strong> para <strong>{item.toPhone}</strong> - {item.body}
                <br />
                <small className="subtle">{formatDateTime(item.createdAt)}</small>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  if (cardId === "stock") {
    return (
      <>
        {data.lowStockProductsItems.length === 0 ? (
          <p className="subtle">Nenhum produto abaixo do mínimo.</p>
        ) : (
          <ul className="detailList">
            {data.lowStockProductsItems.map((item) => (
              <li className="detailItem" key={item.id}>
                <strong>{item.name}</strong>
                <br />
                <small className="subtle">
                  Estoque: {item.currentStock} | Mínimo: {item.minStock}
                </small>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  return (
    <>
      {data.activeCampaignItems.length === 0 ? (
        <p className="subtle">Nenhuma campanha ativa no momento.</p>
      ) : (
        <ul className="detailList">
          {data.activeCampaignItems.map((item) => (
            <li className="detailItem" key={item.id}>
              <strong>{item.title}</strong>
              <br />
              <small className="subtle">
                {formatDateTime(item.startsAt)} at&eacute; {formatDateTime(item.endsAt)}
                {item.segmentPetType ? ` | Segmento: ${item.segmentPetType}` : ""}
              </small>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function HomePage() {
  const [featuredCardId, setFeaturedCardId] = useState<CardId | null>(null);
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

  const cards: Card[] = useMemo(() => {
    if (!dashboard) {
      return [
        { id: "appointments", title: "Agendamentos hoje", value: "-", note: "Carregando..." },
        { id: "sms", title: "Avisos enviados", value: "-", note: "Últimas 24h" },
        { id: "stock", title: "Produtos em estoque baixo", value: "-", note: "Abaixo do mínimo" },
        {
          id: "campaigns",
          title: "Campanhas ativas",
          value: "-",
          note: "Segmentadas por tipo de pet"
        }
      ];
    }

    return [
      {
        id: "appointments",
        title: "Agendamentos hoje",
        value: String(dashboard.appointmentsToday),
        note: `${dashboard.pendingConfirmations} ${pluralize(
          dashboard.pendingConfirmations,
          "confirmação pendente",
          "confirmações pendentes"
        )}`
      },
      {
        id: "sms",
        title: "Avisos enviados",
        value: String(dashboard.smsSentLast24h),
        note: "Últimas 24h"
      },
      {
        id: "stock",
        title: "Produtos em estoque baixo",
        value: String(dashboard.lowStockProducts),
        note: "Abaixo do mínimo"
      },
      {
        id: "campaigns",
        title: "Campanhas ativas",
        value: String(dashboard.activeCampaigns),
        note: "Ativas agora"
      }
    ];
  }, [dashboard]);

  const orderedCards = useMemo(() => {
    if (!featuredCardId) {
      return cards;
    }

    const selected = cards.find((card) => card.id === featuredCardId);
    const others = cards.filter((card) => card.id !== featuredCardId);
    return selected ? [selected, ...others] : cards;
  }, [cards, featuredCardId]);

  return (
    <section>
      <div className="grid">
        {orderedCards.map((card) => (
          <article
            className={`card ${featuredCardId === card.id ? "cardFeatured" : ""}`}
            key={card.id}
          >
            <button
              className="cardButton"
              onClick={() =>
                setFeaturedCardId((current) => (current === card.id ? null : card.id))
              }
              type="button"
            >
              <p className="subtle">{card.title}</p>
              <div className="metric">{card.value}</div>
              <small className="subtle">{card.note}</small>
            </button>
            {featuredCardId === card.id && dashboard ? (
              <div className="cardDetails">{renderDetails(card.id, dashboard)}</div>
            ) : null}
          </article>
        ))}
      </div>

      <article className="panel">
        <h2>Próximos passos técnicos</h2>
        <p>
          Estrutura inicial pronta com API e banco modelados. Clique em um painel para ver os
          detalhes reais no próprio painel.
        </p>
        <span className="tag">MVP em andamento</span>
      </article>
    </section>
  );
}
