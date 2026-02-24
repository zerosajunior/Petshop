"use client";

import { useEffect, useState } from "react";
import type { ApiResponse } from "@/types/api";

type Campaign = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  segmentPetType: "DOG" | "CAT" | "BIRD" | "OTHER" | null;
};

export default function PromocoesPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [segmentPetType, setSegmentPetType] = useState("");
  const [isActive, setIsActive] = useState(true);

  async function refresh() {
    const response = await fetch("/api/campaigns", { cache: "no-store" });
    const payload: ApiResponse<Campaign[]> = await response.json();
    setCampaigns(payload.data ?? []);
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        isActive,
        segmentPetType: segmentPetType || null
      })
    });

    const payload: ApiResponse<unknown> = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Não foi possível salvar a campanha.");
      return;
    }

    setMessage("Campanha criada com sucesso.");
    setTitle("");
    setContent("");
    setStartsAt("");
    setEndsAt("");
    setSegmentPetType("");
    setIsActive(true);
    await refresh();
  }

  return (
    <section>
      <h2>Nova campanha</h2>
      <p className="subtle">Cadastre promoções segmentadas por tipo de pet.</p>

      <article className="panel">
        <form onSubmit={onSubmit}>
          <div className="formGrid">
            <div className="formField">
              <label htmlFor="title">Título</label>
              <input
                id="title"
                onChange={(e) => setTitle(e.target.value)}
                required
                value={title}
              />
            </div>
            <div className="formField">
              <label htmlFor="segmentPetType">Segmento</label>
              <select
                id="segmentPetType"
                onChange={(e) => setSegmentPetType(e.target.value)}
                value={segmentPetType}
              >
                <option value="">Todos</option>
                <option value="DOG">Cães</option>
                <option value="CAT">Gatos</option>
                <option value="BIRD">Aves</option>
                <option value="OTHER">Outros</option>
              </select>
            </div>
            <div className="formField">
              <label htmlFor="startsAt">Início</label>
              <input
                id="startsAt"
                onChange={(e) => setStartsAt(e.target.value)}
                required
                type="datetime-local"
                value={startsAt}
              />
            </div>
            <div className="formField">
              <label htmlFor="endsAt">Fim</label>
              <input
                id="endsAt"
                onChange={(e) => setEndsAt(e.target.value)}
                required
                type="datetime-local"
                value={endsAt}
              />
            </div>
          </div>

          <div className="formField" style={{ marginTop: "0.8rem" }}>
            <label htmlFor="content">Conteúdo</label>
            <textarea
              id="content"
              onChange={(e) => setContent(e.target.value)}
              required
              value={content}
            />
          </div>

          <div className="formActions">
            <label>
              <input
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ marginRight: "0.4rem" }}
                type="checkbox"
              />
              Campanha ativa
            </label>
          </div>

          <div className="formActions">
            <button className="btnPrimary" type="submit">
              Salvar campanha
            </button>
            {message ? <small>{message}</small> : null}
            {error ? <small style={{ color: "#b42318" }}>{error}</small> : null}
          </div>
        </form>
      </article>

      <article className="panel">
        <h3>Campanhas cadastradas</h3>
        <ul className="listSimple">
          {campaigns.slice(0, 10).map((campaign) => (
            <li key={campaign.id}>
              {campaign.title} - {campaign.isActive ? "ativa" : "inativa"}
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
