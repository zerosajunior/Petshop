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

function toLocalDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function dateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function addMinutesToTime(time: string, minutesToAdd: number) {
  const [hoursStr, minutesStr] = time.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return "";
  }

  const base = new Date(2000, 0, 1, hours, minutes, 0, 0);
  const next = new Date(base.getTime() + minutesToAdd * 60 * 1000);
  return `${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfWeek(date: Date) {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function endOfWeek(date: Date) {
  const next = startOfWeek(date);
  next.setDate(next.getDate() + 6);
  return endOfDay(next);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export default function AgendaPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [petId, setPetId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(() => toLocalDateInputValue(new Date()));
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [notes, setNotes] = useState("");
  const [viewMode, setViewMode] = useState<"daily" | "weekly" | "monthly">("daily");
  const [referenceDate, setReferenceDate] = useState(() => startOfDay(new Date()));
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  function resetAppointmentFormAndClose() {
    setPetId("");
    setServiceId("");
    setAppointmentDate(toLocalDateInputValue(new Date()));
    setStartTime("");
    setEndTime("");
    setNotes("");
    setMessage("");
    setError("");
  }

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
    setAppointments(appointmentsPayload.data ?? []);
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    if (!startTime || !serviceId) {
      return;
    }

    const selectedService = services.find((service) => service.id === serviceId);
    if (!selectedService) {
      return;
    }

    const calculatedEnd = addMinutesToTime(startTime, selectedService.durationMin);
    if (!calculatedEnd) {
      return;
    }
    setEndTime(calculatedEnd);
  }, [serviceId, services, startTime]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!serviceId) {
      setError("Selecione um serviço da lista predefinida.");
      return;
    }

    if (!appointmentDate || !startTime || !endTime) {
      setError("Selecione data, horário de início e horário de fim.");
      return;
    }

    const startsAt = `${appointmentDate}T${startTime}`;
    const endsAt = `${appointmentDate}T${endTime}`;

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
    setStartTime("");
    setEndTime("");
    await refresh();
  }

  const timeOptions = Array.from({ length: 181 }, (_, index) => {
    const totalMinutes = 8 * 60 + index * 5;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  });
  const endTimeOptions = endTime && !timeOptions.includes(endTime) ? [...timeOptions, endTime] : timeOptions;
  const dateOptions = Array.from({ length: 61 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return toLocalDateInputValue(date);
  });

  const canSchedule = pets.length > 0 && services.length > 0;
  const periodStart =
    viewMode === "daily"
      ? startOfDay(referenceDate)
      : viewMode === "weekly"
        ? startOfWeek(referenceDate)
        : startOfMonth(referenceDate);
  const periodEnd =
    viewMode === "daily"
      ? endOfDay(referenceDate)
      : viewMode === "weekly"
        ? endOfWeek(referenceDate)
        : endOfMonth(referenceDate);
  const appointmentsFiltered = appointments.filter((appointment) => {
    if (!searchTerm.trim()) {
      return true;
    }
    const term = searchTerm.toLowerCase();
    return (
      appointment.pet.name.toLowerCase().includes(term) ||
      appointment.pet.customer.name.toLowerCase().includes(term)
    );
  });

  const appointmentsByDay = appointmentsFiltered.reduce<Record<string, Appointment[]>>(
    (acc, appointment) => {
      const startsAt = new Date(appointment.startsAt);
      const key = toDateKey(startsAt);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(appointment);
      return acc;
    },
    {}
  );

  const calendarDays: { date: Date; inPeriod: boolean }[] = [];
  if (viewMode === "daily") {
    calendarDays.push({ date: periodStart, inPeriod: true });
  } else if (viewMode === "weekly") {
    const cursor = new Date(periodStart);
    while (cursor <= periodEnd) {
      calendarDays.push({ date: new Date(cursor), inPeriod: true });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    const monthStart = startOfMonth(referenceDate);
    const monthEnd = endOfMonth(referenceDate);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);
    const cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      calendarDays.push({
        date: new Date(cursor),
        inPeriod: cursor >= monthStart && cursor <= monthEnd
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const hasAnyAppointmentsInView = calendarDays.some((day) => {
    const items = appointmentsByDay[toDateKey(day.date)] ?? [];
    return items.length > 0;
  });

  function movePeriod(direction: "prev" | "next") {
    const next = new Date(referenceDate);
    const delta = direction === "prev" ? -1 : 1;
    if (viewMode === "daily") {
      next.setDate(next.getDate() + delta);
    } else if (viewMode === "weekly") {
      next.setDate(next.getDate() + 7 * delta);
    } else {
      next.setMonth(next.getMonth() + delta);
    }
    setReferenceDate(startOfDay(next));
  }

  const periodLabel =
    viewMode === "daily"
      ? periodStart.toLocaleDateString("pt-BR")
      : viewMode === "weekly"
        ? `${periodStart.toLocaleDateString("pt-BR")} a ${periodEnd.toLocaleDateString("pt-BR")}`
        : periodStart.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <section>
      <h2>Agendamentos</h2>
      <p className="subtle">Acompanhe os próximos horários e crie um novo quando necessário.</p>

      {!canSchedule ? (
        <article className="panel">
          <strong>Faltam opções para agendar.</strong>
          <p className="subtle" style={{ marginTop: "0.4rem" }}>
            Cadastre cliente/pet em novo cadastro e inclua serviço na tela de serviços.
          </p>
        </article>
      ) : null}

      <article className="panel">
        <div className="agendaControlRow">
          <input
            className="agendaSearchInput"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Pesquisar por pet ou dono"
            value={searchInput}
          />
          <button
            className="btnSecondary actionBtnSameHeight agendaPanelBtn"
            onClick={() => setSearchTerm(searchInput.trim())}
            type="button"
          >
            Pesquisar
          </button>
          <button
            className="btnSecondary actionBtnSameHeight agendaPanelBtn"
            onClick={() => {
              setSearchInput("");
              setSearchTerm("");
            }}
            type="button"
          >
            Limpar
          </button>
          <Link className="btnSecondary actionBtnSameHeight agendaPanelBtn" href="/cadastro">
            Cadastro
          </Link>
          <Link className="btnSecondary actionBtnSameHeight agendaPanelBtn" href="/servicos">
            Serviços
          </Link>
          <Link className="btnPrimary actionBtnSameHeight actionBtnSameSize agendaBackBtn" href="/">
            Voltar ao painel
          </Link>
        </div>

        <form onSubmit={onSubmit}>
            <div className="formGrid agendaScheduleGrid">
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
                <label htmlFor="serviceId">Serviço (lista predefinida)</label>
                <select
                  id="serviceId"
                  onChange={(e) => setServiceId(e.target.value)}
                  required
                  value={serviceId}
                >
                  <option value="">Selecione o serviço</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} ({service.durationMin} min)
                    </option>
                  ))}
                </select>
                {services.length === 0 ? (
                  <small className="subtle">Nenhum serviço predefinido disponível.</small>
                ) : null}
              </div>

              <div className="formField">
                <label htmlFor="appointmentDate">Data</label>
                <select
                  id="appointmentDate"
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  required
                  value={appointmentDate}
                >
                  <option value="">Selecione a data</option>
                  {dateOptions.map((date) => (
                    <option key={date} value={date}>
                      {dateLabel(date)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="formField">
                <label htmlFor="startTime">Início</label>
                <select
                  id="startTime"
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  value={startTime}
                >
                  <option value="">Selecione o horário</option>
                  {timeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                {serviceId ? (
                  <small className="subtle">Fim calculado automaticamente conforme duração do serviço.</small>
                ) : null}
              </div>

              <div className="formField">
                <label htmlFor="endTime">Fim</label>
                <select
                  id="endTime"
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  value={endTime}
                >
                  <option value="">Selecione o horário</option>
                  {endTimeOptions.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
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
              <button className="btnSecondary" onClick={resetAppointmentFormAndClose} type="button">
                Cancelar
              </button>
              {message ? <small>{message}</small> : null}
              {error ? <small style={{ color: "#b42318" }}>{error}</small> : null}
            </div>
          </form>
      </article>

      <article className="panel">
        <h3>Próximos agendamentos</h3>
        <div className="pageActions agendaCalendarToolbar">
          <div className="agendaPeriodNav">
            <strong className="agendaPeriodInlineLabel">{periodLabel}</strong>
            <button className="btnSecondary" onClick={() => movePeriod("prev")} type="button">
              Anterior
            </button>
            <button className="btnSecondary" onClick={() => movePeriod("next")} type="button">
              Próximo
            </button>
            <button
              className="btnSecondary"
              onClick={() => setReferenceDate(startOfDay(new Date()))}
              type="button"
            >
              Hoje
            </button>
          </div>
          <div className="agendaViewModes">
            <button
              className={`btnSecondary ${viewMode === "daily" ? "agendaModeActive" : ""}`}
              onClick={() => setViewMode("daily")}
              type="button"
            >
              Diário
            </button>
            <button
              className={`btnSecondary ${viewMode === "weekly" ? "agendaModeActive" : ""}`}
              onClick={() => setViewMode("weekly")}
              type="button"
            >
              Semanal
            </button>
            <button
              className={`btnSecondary ${viewMode === "monthly" ? "agendaModeActive" : ""}`}
              onClick={() => setViewMode("monthly")}
              type="button"
            >
              Mensal
            </button>
          </div>
        </div>
        {!hasAnyAppointmentsInView ? (
          <p className="subtle">Nenhum agendamento neste período.</p>
        ) : (
          <div
            className={`agendaCalendarGrid ${
              viewMode === "daily"
                ? "agendaCalendarGridDaily"
                : viewMode === "weekly"
                  ? "agendaCalendarGridWeekly"
                  : "agendaCalendarGridMonthly"
            }`}
          >
            {calendarDays.map((day) => {
              const dateKey = toDateKey(day.date);
              const items = (appointmentsByDay[dateKey] ?? []).sort(
                (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
              );
              return (
                <div
                  className={`agendaCalendarDay ${day.inPeriod ? "" : "agendaCalendarDayMuted"}`}
                  key={dateKey}
                >
                  <div className="agendaCalendarDayHeader">
                    <strong>
                      {day.date.toLocaleDateString("pt-BR", {
                        weekday: viewMode === "monthly" ? undefined : "short",
                        day: "2-digit",
                        month: "2-digit"
                      })}
                    </strong>
                  </div>
                  {items.length === 0 ? (
                    <small className="subtle">Sem agendamentos</small>
                  ) : viewMode === "monthly" ? (
                    <div className="agendaBusinessHoursGrid">
                      {items.map((appointment) => {
                        const startsAt = new Date(appointment.startsAt);
                        return (
                          <div className="agendaBusinessHourRow" key={appointment.id}>
                            <span className="agendaBusinessHourLabel">
                              {startsAt.toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                            <span className="agendaBusinessHourPet">{appointment.pet.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="agendaCalendarAppointments">
                      {items.map((appointment) => (
                        <div className="agendaCalendarChip" key={appointment.id}>
                          {new Date(appointment.startsAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}{" "}
                          · {appointment.pet.name} · {appointment.service.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </article>
    </section>
  );
}
