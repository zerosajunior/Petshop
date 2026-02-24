"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ApiResponse } from "@/types/api";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
};

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [priceBRL, setPriceBRL] = useState(100);

  async function refresh() {
    const response = await fetch("/api/services", { cache: "no-store" });
    const payload: ApiResponse<Service[]> = await response.json();
    setServices(payload.data ?? []);
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const response = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        durationMin,
        priceCents: Math.round(priceBRL * 100)
      })
    });

    const payload: ApiResponse<unknown> = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Não foi possível salvar o serviço.");
      return;
    }

    setMessage("Serviço criado com sucesso.");
    setName("");
    setDescription("");
    setDurationMin(60);
    setPriceBRL(100);
    await refresh();
  }

  return (
    <section>
      <h2>Serviços</h2>
      <p className="subtle">Cadastre e mantenha a lista predefinida de serviços.</p>

      <article className="panel">
        <div className="pageActions">
          <Link className="btnPrimary" href="/agenda">
            Ir para agendamento
          </Link>
          <Link className="btnSecondary" href="/">
            Voltar ao painel
          </Link>
        </div>

        <form onSubmit={onSubmit}>
          <div className="formGrid">
            <div className="formField">
              <label htmlFor="name">Nome</label>
              <input id="name" onChange={(e) => setName(e.target.value)} required value={name} />
            </div>
            <div className="formField">
              <label htmlFor="description">Descrição (opcional)</label>
              <input
                id="description"
                onChange={(e) => setDescription(e.target.value)}
                value={description}
              />
            </div>
            <div className="formField">
              <label htmlFor="durationMin">Duração (min)</label>
              <input
                id="durationMin"
                min={1}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                required
                type="number"
                value={durationMin}
              />
            </div>
            <div className="formField">
              <label htmlFor="priceBRL">Preço (R$)</label>
              <input
                id="priceBRL"
                min={0.01}
                onChange={(e) => setPriceBRL(Number(e.target.value))}
                required
                type="number"
                step="0.01"
                value={priceBRL}
              />
            </div>
          </div>

          <div className="formActions">
            <button className="btnPrimary" type="submit">
              Salvar serviço
            </button>
            {message ? <small>{message}</small> : null}
            {error ? <small style={{ color: "#b42318" }}>{error}</small> : null}
          </div>
        </form>
      </article>

      <article className="panel">
        <h3>Serviços predefinidos</h3>
        <ul className="listSimple">
          {services.map((service) => (
            <li key={service.id}>
              {service.name} - {service.durationMin} min - R${" "}
              {(service.priceCents / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
