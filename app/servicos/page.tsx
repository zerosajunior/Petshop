"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ApiResponse } from "@/types/api";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  priceCents: number;
};

function toBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export default function ServicosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationMin, setDurationMin] = useState(60);
  const [priceBRL, setPriceBRL] = useState(100);

  const [editingServiceId, setEditingServiceId] = useState("");
  const [deletingServiceId, setDeletingServiceId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function refresh() {
    const response = await fetch("/api/services", { cache: "no-store" });
    const payload: ApiResponse<Service[]> = await response.json();
    setServices(payload.data ?? []);
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  const editingService = useMemo(
    () => services.find((service) => service.id === editingServiceId) ?? null,
    [editingServiceId, services]
  );

  function resetForm() {
    setName("");
    setDescription("");
    setDurationMin(60);
    setPriceBRL(100);
    setEditingServiceId("");
  }

  function startEdit(service: Service) {
    setEditingServiceId(service.id);
    setName(service.name);
    setDescription(service.description ?? "");
    setDurationMin(service.durationMin);
    setPriceBRL(service.priceCents / 100);
    setMessage("");
    setError("");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const endpoint = editingServiceId ? `/api/services/${editingServiceId}` : "/api/services";
      const method = editingServiceId ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
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

      setMessage(editingServiceId ? "Serviço atualizado com sucesso." : "Serviço criado com sucesso.");
      resetForm();
      await refresh();
    } catch {
      setError("Falha de conexão ao salvar o serviço.");
    } finally {
      setIsSaving(false);
    }
  }

  async function onDelete(service: Service) {
    const confirmed = window.confirm(`Excluir o serviço \"${service.name}\"?`);
    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");
    setDeletingServiceId(service.id);

    try {
      const response = await fetch(`/api/services/${service.id}`, {
        method: "DELETE"
      });
      const payload: ApiResponse<unknown> = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Não foi possível excluir o serviço.");
        return;
      }

      if (editingServiceId === service.id) {
        resetForm();
      }
      setMessage("Serviço excluído com sucesso.");
      await refresh();
    } catch {
      setError("Falha de conexão ao excluir o serviço.");
    } finally {
      setDeletingServiceId("");
    }
  }

  return (
    <section>
      <h2>Serviços</h2>
      <p className="subtle">Cadastro, edição e exclusão de serviços em uma única tela.</p>

      <article className="panel">
        <div className="pageActions appActionBar">
          <Link className="btnSecondary appActionBack" href="/">
            Voltar ao painel
          </Link>
          <Link className="btnPrimary appActionMain" href="/agenda">
            Ir para agendamento
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
              <input id="description" onChange={(e) => setDescription(e.target.value)} value={description} />
            </div>
            <div className="formField">
              <label htmlFor="durationMin">Duração (min)</label>
              <input
                id="durationMin"
                min={1}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                required
                step={1}
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
                step="0.01"
                type="number"
                value={priceBRL}
              />
            </div>
          </div>

          <div className="formActions">
            <button className="btnPrimary" disabled={isSaving} type="submit">
              {isSaving ? "Salvando..." : editingService ? "Salvar alterações" : "Salvar serviço"}
            </button>
            <button className="btnSecondary" onClick={resetForm} type="button">
              {editingService ? "Cancelar edição" : "Limpar"}
            </button>
            {message ? <small>{message}</small> : null}
            {error ? <small style={{ color: "#b42318" }}>{error}</small> : null}
          </div>
        </form>
      </article>

      <article className="panel">
        <h3>Serviços cadastrados</h3>
        <ul className="listSimple">
          {services.map((service) => (
            <li key={service.id} style={{ display: "grid", gap: "0.4rem" }}>
              <div>
                <strong>{service.name}</strong> - {service.durationMin} min - R$ {toBRL(service.priceCents)}
                {service.description ? ` - ${service.description}` : ""}
              </div>
              <div className="formActions" style={{ marginTop: 0 }}>
                <button className="btnSecondary" onClick={() => startEdit(service)} type="button">
                  Editar
                </button>
                <button
                  className="btnDanger"
                  disabled={deletingServiceId === service.id}
                  onClick={() => onDelete(service)}
                  type="button"
                >
                  {deletingServiceId === service.id ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </li>
          ))}
          {services.length === 0 ? <li className="subtle">Nenhum serviço cadastrado.</li> : null}
        </ul>
      </article>
    </section>
  );
}
