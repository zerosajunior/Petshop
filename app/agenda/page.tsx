"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiResponse } from "@/types/api";
import Link from "next/link";

type Pet = { id: string; name: string; customer: { name: string } };
type Service = { id: string; name: string; durationMin: number };
type Appointment = {
  id: string;
  startsAt: string;
  status: string;
  pet: { name: string; customer: { name: string } };
  service: { name: string };
};

function toIso(localDateTime: string) {
  return new Date(localDateTime).toISOString();
}

export default function AgendaPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [petId, setPetId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [notes, setNotes] = useState("");

  const refresh = useCallback(async function refreshData() {
    const [petsRes, servicesRes, appointmentsRes] = await Promise.all([
      fetch("/api/pets", { cache: "no-store" }),
      fetch("/api/services", { cache: "no-store" }),
      fetch("/api/appointments", { cache: "no-store" })
    ]);

    const petsPayload: ApiResponse<Pet[]> = await petsRes.json();
    const servicesPayload: ApiResponse<Service[]> = await servicesRes.json();
    const appointmentsPayload: ApiResponse<Appointment[]> = await appointmentsRes.json();

    setPets(petsPayload.data ?? []);
    setServices(servicesPayload.data ?? []);
    setAppointments((appointmentsPayload.data ?? []).slice(0, 8));
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!serviceId) {
      setError("Selecione um serviço da lista predefinida.");
      return;
    }

    const response = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        petId,
        serviceId,
        startsAt: toIso(startsAt),
        endsAt: toIso(endsAt),
        notes
      })
    });

    const payload: ApiResponse<unknown> = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Não foi possível salvar o agendamento.");
      return;
    }

    setMessage("Agendamento criado com sucesso.");
    setNotes("");
    await refresh();
  }

  const canSchedule = pets.length > 0 && services.length > 0;

  return (
    <section>
      <h2>Novo agendamento</h2>
      <p className="subtle">Cadastre agendamentos diretamente nesta tela.</p>

      {!canSchedule ? (
        <article className="panel">
          <strong>Faltam opções para agendar.</strong>
          <p className="subtle" style={{ marginTop: "0.4rem" }}>
            Cadastre cliente/pet em novo cadastro e inclua serviço na tela de serviços.
          </p>
        </article>
      ) : null}

      <article className="panel">
        <div className="pageActions">
          <Link className="btnPrimary" href="/cadastro">
            Novo cadastro
          </Link>
          <Link className="btnSecondary" href="/servicos">
            Serviços
          </Link>
          <Link className="btnSecondary" href="/">
            Voltar ao painel
          </Link>
        </div>

        <form onSubmit={onSubmit}>
          <div className="formGrid">
            <div className="formField">
              <label htmlFor="petId">Pet</label>
              <select id="petId" onChange={(e) => setPetId(e.target.value)} required value={petId}>
                <option value="">Selecione</option>
                {pets.map((pet) => (
                  <option key={pet.id} value={pet.id}>
                    {pet.name} ({pet.customer.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="formField">
              <label>Serviço (lista predefinida)</label>
              <div className="servicePicker">
                {services.map((service) => (
                  <button
                    key={service.id}
                    className={`serviceOption ${serviceId === service.id ? "active" : ""}`}
                    onClick={() => setServiceId(service.id)}
                    type="button"
                  >
                    {service.name} ({service.durationMin} min)
                  </button>
                ))}
              </div>
              {services.length === 0 ? <small className="subtle">Nenhum serviço predefinido disponível.</small> : null}
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
            <label htmlFor="notes">Observações</label>
            <textarea id="notes" onChange={(e) => setNotes(e.target.value)} value={notes} />
          </div>

          <div className="formActions">
            <button className="btnPrimary" disabled={!canSchedule} type="submit">
              Salvar agendamento
            </button>
            {message ? <small>{message}</small> : null}
            {error ? <small style={{ color: "#b42318" }}>{error}</small> : null}
          </div>
        </form>
      </article>

      <article className="panel">
        <h3>Próximos agendamentos</h3>
        <ul className="listSimple">
          {appointments.map((appointment) => (
            <li key={appointment.id}>
              {appointment.pet.name} ({appointment.pet.customer.name}) - {appointment.service.name} -{" "}
              {new Date(appointment.startsAt).toLocaleString("pt-BR")} - {appointment.status}
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
