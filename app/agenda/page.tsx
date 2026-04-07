"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiResponse } from "@/types/api";
import Link from "next/link";
import { DEFAULT_PETSHOP_SERVICES } from "@/lib/default-services";

type Pet = {
  id: string;
  name: string;
  isDeceased?: boolean;
  customer: { id: string; name: string; phone?: string; zipCode?: string; street?: string; city?: string };
};
type Service = { id: string; name: string; durationMin: number; priceCents: number };
type CreatedService = { id: string; name: string; durationMin: number; priceCents: number };
type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";
type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  startedAt?: string | null;
  finishedAt?: string | null;
  chargedPriceCents?: number | null;
  pet: { name: string; customer: { name: string } };
  service: { name: string };
};
type CustomerListItem = {
  id: string;
  name: string;
  phone: string;
  zipCode: string;
  street?: string | null;
  city?: string | null;
  pets: Array<{ id: string; name: string; isDeceased?: boolean | null }>;
};

const statusLabelMap: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado"
};

function toIso(localDateTime: string) {
  return new Date(localDateTime).toISOString();
}

function toLocalDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
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

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

export default function AgendaPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSavingAppointment, setIsSavingAppointment] = useState(false);

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
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState("");
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [isSchedulingOpen, setIsSchedulingOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [isDefaultServicePickerOpen, setIsDefaultServicePickerOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [serviceDurationMin, setServiceDurationMin] = useState(60);
  const [servicePriceBRL, setServicePriceBRL] = useState(100);
  const [serviceMessage, setServiceMessage] = useState("");
  const [serviceError, setServiceError] = useState("");
  const [chargedPriceBRL, setChargedPriceBRL] = useState(0);
  const [isSavingService, setIsSavingService] = useState(false);
  const [isSavingDefaultServices, setIsSavingDefaultServices] = useState(false);
  const [selectedDefaultServices, setSelectedDefaultServices] = useState<string[]>([]);
  const [autoSelectedServiceId, setAutoSelectedServiceId] = useState("");
  const useCompactCalendarActions = viewMode === "weekly" || viewMode === "monthly";

  function resetAppointmentFormAndClose() {
    setPetId("");
    setServiceId("");
    setAppointmentDate(toLocalDateInputValue(new Date()));
    setStartTime("");
    setEndTime("");
    setAutoSelectedServiceId("");
    setNotes("");
    setChargedPriceBRL(0);
    setMessage("");
    setError("");
    resetServiceFormAndClose();
    setIsSchedulingOpen(false);
  }

  function resetServiceFormAndClose() {
    setServiceName("");
    setServiceDescription("");
    setServiceDurationMin(60);
    setServicePriceBRL(100);
    setServiceMessage("");
    setServiceError("");
    setIsServiceFormOpen(false);
  }

  const refresh = useCallback(async function refreshData() {
    const [petsRes, customersRes, servicesRes, appointmentsRes] = await Promise.all([
      fetch("/api/pets", { cache: "no-store" }),
      fetch("/api/customers", { cache: "no-store" }),
      fetch("/api/services", { cache: "no-store" }),
      fetch("/api/appointments", { cache: "no-store" })
    ]);

    const petsPayload: ApiResponse<Pet[]> = await petsRes.json();
    const customersPayload: ApiResponse<CustomerListItem[]> = await customersRes.json();
    const servicesPayload: ApiResponse<Service[]> = await servicesRes.json();
    const appointmentsPayload: ApiResponse<Appointment[]> = await appointmentsRes.json();

    setPets(petsPayload.data ?? []);
    setCustomers(customersPayload.data ?? []);
    setServices(servicesPayload.data ?? []);
    setAppointments(appointmentsPayload.data ?? []);
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

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

  useEffect(() => {
    if (!serviceId) {
      return;
    }
    const selectedService = services.find((service) => service.id === serviceId);
    if (!selectedService) {
      return;
    }
    setChargedPriceBRL(selectedService.priceCents / 100);
  }, [serviceId, services]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (isSavingAppointment) {
      return;
    }

    if (!serviceId) {
      setError("Selecione um serviço da lista predefinida.");
      return;
    }

    if (!appointmentDate || !startTime || !endTime) {
      setError("Selecione data, horário de início e horário de fim.");
      return;
    }
    if (endTime <= startTime) {
      setError("O horário de fim deve ser maior que o horário de início.");
      return;
    }

    const startsAt = `${appointmentDate}T${startTime}`;
    const endsAt = `${appointmentDate}T${endTime}`;
    const chargedPriceCents = Math.round(chargedPriceBRL * 100);
    if (!Number.isFinite(chargedPriceCents) || chargedPriceCents < 0) {
      setError("Informe um valor válido para o serviço.");
      return;
    }
    setIsSavingAppointment(true);
    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          petId,
          serviceId,
          startsAt: toIso(startsAt),
          endsAt: toIso(endsAt),
          chargedPriceCents,
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
      setChargedPriceBRL(0);
      setAutoSelectedServiceId("");
      await refresh();
    } catch {
      setError("Falha de conexão ao salvar o agendamento.");
    } finally {
      setIsSavingAppointment(false);
    }
  }

  async function onCreateService() {
    setServiceMessage("");
    setServiceError("");
    if (!serviceName.trim()) {
      setServiceError("Informe o nome do serviço.");
      return;
    }
    if (!Number.isFinite(serviceDurationMin) || serviceDurationMin <= 0) {
      setServiceError("Informe uma duração válida (maior que zero).");
      return;
    }
    if (!Number.isFinite(servicePriceBRL) || servicePriceBRL <= 0) {
      setServiceError("Informe um preço válido (maior que zero).");
      return;
    }
    if (isSavingService) {
      return;
    }

    setIsSavingService(true);
    try {
      const response = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: serviceName.trim(),
          description: serviceDescription || undefined,
          durationMin: serviceDurationMin,
          priceCents: Math.round(servicePriceBRL * 100)
        })
      });

      const payload: ApiResponse<CreatedService> = await response.json();
      if (!response.ok) {
        setServiceError(payload.error ?? "Não foi possível salvar o serviço.");
        return;
      }

      const createdServiceId = payload.data?.id ?? "";
      await refresh();
      if (createdServiceId) {
        setServiceId(createdServiceId);
        setAutoSelectedServiceId(createdServiceId);
      }
      setMessage("Serviço criado e selecionado para o agendamento.");
      setError("");
      setIsServiceFormOpen(false);
      setServiceName("");
      setServiceDescription("");
      setServiceDurationMin(60);
      setServicePriceBRL(100);
      setIsSchedulingOpen(true);
    } catch {
      setServiceError("Falha de conexão ao salvar o serviço.");
    } finally {
      setIsSavingService(false);
    }
  }

  function toggleDefaultService(serviceKey: string) {
    setSelectedDefaultServices((prev) =>
      prev.includes(serviceKey) ? prev.filter((item) => item !== serviceKey) : [...prev, serviceKey]
    );
  }

  async function onSaveSelectedDefaultServices() {
    setServiceMessage("");
    setServiceError("");
    if (selectedDefaultServices.length === 0) {
      setServiceError("Selecione ao menos um serviço para continuar.");
      return;
    }
    if (isSavingDefaultServices) {
      return;
    }

    const selectedCatalogItems = DEFAULT_PETSHOP_SERVICES.filter((item) =>
      selectedDefaultServices.includes(item.key)
    );
    const existingNames = new Set(services.map((service) => normalizeText(service.name)));
    const toCreate = selectedCatalogItems.filter((item) => !existingNames.has(normalizeText(item.name)));
    if (toCreate.length === 0) {
      setServiceMessage("Nenhum serviço novo para adicionar.");
      setSelectedDefaultServices([]);
      setIsDefaultServicePickerOpen(false);
      return;
    }

    setIsSavingDefaultServices(true);
    try {
      const results = await Promise.all(
        toCreate.map((item) =>
          fetch("/api/services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: item.name,
              description: item.description,
              durationMin: item.durationMin,
              priceCents: item.priceCents
            })
          })
        )
      );

      const firstError = results.find((result) => !result.ok);
      if (firstError) {
        const payload: ApiResponse<unknown> = await firstError.json().catch(() => ({}));
        setServiceError(payload.error ?? "Não foi possível salvar a seleção de serviços.");
        return;
      }

      await refresh();
      setSelectedDefaultServices([]);
      setIsDefaultServicePickerOpen(false);
      setServiceMessage("Serviços selecionados e liberados para agendamento.");
      setMessage("Serviços configurados com sucesso.");
      setIsSchedulingOpen(true);
    } catch {
      setServiceError("Falha de conexão ao salvar serviços selecionados.");
    } finally {
      setIsSavingDefaultServices(false);
    }
  }

  async function updateAppointmentStatus(appointmentId: string, status: AppointmentStatus) {
    setMessage("");
    setError("");
    setUpdatingAppointmentId(appointmentId);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });

      const payload: ApiResponse<unknown> = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Não foi possível atualizar o status do agendamento.");
        return;
      }

      setMessage(`Agendamento atualizado para ${statusLabelMap[status].toLowerCase()}.`);
      await refresh();
    } catch {
      setError("Falha de conexão ao atualizar status do agendamento.");
    } finally {
      setUpdatingAppointmentId("");
    }
  }

  function canStartService(appointment: Appointment) {
    return appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED";
  }

  function canFinishService(appointment: Appointment) {
    return appointment.status === "IN_PROGRESS";
  }

  function canCancel(appointment: Appointment) {
    return (
      appointment.status === "SCHEDULED" ||
      appointment.status === "CONFIRMED" ||
      appointment.status === "IN_PROGRESS"
    );
  }

  function isAppointmentLate(appointment: Appointment) {
    if (appointment.status === "COMPLETED" || appointment.status === "CANCELED") {
      return false;
    }
    return new Date(appointment.endsAt).getTime() < nowTick;
  }

  const timeOptions = Array.from({ length: 181 }, (_, index) => {
    const totalMinutes = 8 * 60 + index * 5;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  });
  const endTimeOptions = endTime && !timeOptions.includes(endTime) ? [...timeOptions, endTime] : timeOptions;
  const activePets = pets.filter((pet) => !pet.isDeceased);
  const canSchedule = activePets.length > 0 && services.length > 0;
  const needsInitialServiceSetup = services.length === 0;
  const canShowAppointmentFields =
    !needsInitialServiceSetup && !isDefaultServicePickerOpen && !isServiceFormOpen;
  const activeServiceNames = new Set(services.map((service) => normalizeText(service.name)));
  const defaultServicesView = DEFAULT_PETSHOP_SERVICES.map((item) => ({
    ...item,
    isActive: activeServiceNames.has(normalizeText(item.name))
  }));
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
  const searchedCustomers = customers.filter((customer) => {
    if (!searchTerm.trim()) {
      return true;
    }
    const term = searchTerm.toLowerCase();
    if (customer.name.toLowerCase().includes(term) || customer.phone.toLowerCase().includes(term)) {
      return true;
    }
    return customer.pets.some((pet) => pet.name.toLowerCase().includes(term));
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
            Cadastre cliente/pet em novo cadastro e configure os serviços da empresa.
          </p>
        </article>
      ) : null}

      <article className="panel">
        <div className="agendaControlRow">
          <input
            className="agendaSearchInput"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Pesquisar por pet ou cliente"
            value={searchInput}
          />
          <button
            aria-label="Pesquisar"
            className="btnSecondary actionBtnSameHeight agendaPanelBtn iconSearchBtn tooltipTrigger"
            data-tooltip="Pesquisar"
            onClick={() => {
              setSearchTerm(searchInput.trim());
              setIsSearchPanelOpen(true);
            }}
            title="Pesquisar"
            type="button"
          >
            🔍
          </button>
          <button
            aria-label="Limpar"
            className="btnSecondary actionBtnSameHeight agendaPanelBtn iconClearBtn tooltipTrigger"
            data-tooltip="Limpar"
            onClick={() => {
              setSearchInput("");
              setSearchTerm("");
              setIsSearchPanelOpen(false);
            }}
            title="Limpar"
            type="button"
          >
            Limpar
          </button>
          <Link className="btnSecondary actionBtnSameHeight agendaPanelBtn" href="/cadastro">
            Cadastro
          </Link>
          <Link className="btnSecondary actionBtnSameHeight agendaPanelBtn" href="/servicos">
            Serviço
          </Link>
          <button
            className="btnSecondary actionBtnSameHeight agendaPanelBtn"
            onClick={() => {
              if (isSchedulingOpen) {
                resetAppointmentFormAndClose();
                return;
              }
              setMessage("");
              setError("");
              setIsDefaultServicePickerOpen(false);
              setIsServiceFormOpen(false);
              setIsSchedulingOpen(true);
            }}
            type="button"
          >
            {isSchedulingOpen ? "Fechar agendamento" : "Novo agendamento"}
          </button>
          <Link className="btnPrimary actionBtnSameHeight actionBtnSameSize agendaBackBtn" href="/">
            Voltar ao painel
          </Link>
        </div>

        {isSearchPanelOpen ? (
          <div className="panel" style={{ marginTop: "0.8rem", background: "#fff7ed" }}>
            <div className="pageActions" style={{ marginBottom: "0.5rem" }}>
              <strong>Resultado da busca</strong>
              <button className="btnSecondary" onClick={() => setIsSearchPanelOpen(false)} type="button">
                Fechar resultado
              </button>
            </div>
            {searchedCustomers.length === 0 ? (
              <small className="subtle">Nenhum cliente/pet encontrado para este termo.</small>
            ) : (
              <ul className="listSimple">
                {searchedCustomers.slice(0, 12).map((customer) => (
                  <li key={customer.id}>
                    <strong>{customer.name}</strong> - {customer.phone} - CEP {customer.zipCode}
                    {customer.street ? ` - ${customer.street}` : ""}
                    {customer.city ? ` - ${customer.city}` : ""}
                    {customer.pets.length > 0
                      ? ` - Pets: ${customer.pets
                          .map((pet) => `${pet.name}${pet.isDeceased ? " (falecido)" : ""}`)
                          .join(", ")}`
                      : " - Sem pets"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {isSchedulingOpen ? (
          <form onSubmit={onSubmit}>
            {needsInitialServiceSetup ? (
              <p className="subtle" style={{ marginTop: 0 }}>
                Para liberar agendamentos, selecione e salve os serviços que a empresa presta.
              </p>
            ) : null}
            <div className="formGrid agendaScheduleGrid">
              {isDefaultServicePickerOpen ? (
                <div className="formField formFieldFull">
                  <div className="serviceCatalogPanel">
                    <strong style={{ display: "block", marginBottom: "0.4rem" }}>
                      {needsInitialServiceSetup
                        ? "Seleção inicial obrigatória de serviços"
                        : "Selecionar novos serviços da lista padrão"}
                    </strong>
                    <p className="subtle" style={{ marginTop: 0 }}>
                      Marque os serviços que você presta. Os não selecionados permanecem esmaecidos.
                    </p>
                    <div className="servicePicker">
                      {defaultServicesView.map((service) => {
                        const isSelected = selectedDefaultServices.includes(service.key);
                        const className = `serviceOption ${
                          service.isActive ? "active" : isSelected ? "pending" : "muted"
                        }`;
                        return (
                          <label className={className} key={service.key}>
                            <input
                              checked={isSelected}
                              disabled={service.isActive}
                              onChange={() => toggleDefaultService(service.key)}
                              type="checkbox"
                            />
                            <span>
                              {service.name} ({service.durationMin} min)
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="formActions" style={{ marginTop: "0.6rem" }}>
                      <button
                        className="btnPrimary"
                        disabled={isSavingDefaultServices}
                        onClick={() => onSaveSelectedDefaultServices()}
                        type="button"
                      >
                        {isSavingDefaultServices ? "Salvando..." : "Salvar seleção de serviços"}
                      </button>
                      {serviceMessage ? <small>{serviceMessage}</small> : null}
                      {serviceError ? <small style={{ color: "#b42318" }}>{serviceError}</small> : null}
                    </div>
                  </div>
                </div>
              ) : null}

              {canShowAppointmentFields ? (
                <>
              <div className="formField">
                <label htmlFor="petId">Pet</label>
                <select id="petId" onChange={(e) => setPetId(e.target.value)} required value={petId}>
                  <option value="">Selecione</option>
                  {activePets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.customer.name} - {pet.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="formField">
                <label htmlFor="serviceId">Serviço (lista predefinida)</label>
                <select
                  id="serviceId"
                  onChange={(e) => {
                    setServiceId(e.target.value);
                    if (e.target.value !== autoSelectedServiceId) {
                      setAutoSelectedServiceId("");
                    }
                  }}
                  required
                  style={
                    autoSelectedServiceId && autoSelectedServiceId === serviceId
                      ? { borderColor: "#2a8369", background: "#f1fbf7" }
                      : undefined
                  }
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
                  <small className="subtle">Nenhum serviço disponível. Use o botão Selecionar novo serviço.</small>
                ) : null}
                {autoSelectedServiceId && autoSelectedServiceId === serviceId ? (
                  <small style={{ color: "#1f6b55" }}>Serviço novo selecionado automaticamente.</small>
                ) : null}
              </div>
              <div className="formField">
                <label htmlFor="chargedPriceBRL">Valor do serviço (R$)</label>
                <input
                  id="chargedPriceBRL"
                  min={0}
                  onChange={(event) => setChargedPriceBRL(Number(event.target.value))}
                  step="0.01"
                  type="number"
                  value={chargedPriceBRL}
                />
              </div>

              {isServiceFormOpen ? (
                <div className="formField formFieldFull">
                  <div
                    style={{
                      border: "1px dashed var(--border)",
                      borderRadius: "12px",
                      padding: "0.7rem",
                      background: "#fffaf0"
                    }}
                  >
                    <strong style={{ display: "block", marginBottom: "0.55rem" }}>
                      Cadastro rápido de serviço
                    </strong>
                    <div className="formGrid" style={{ marginBottom: "0.5rem" }}>
                      <div className="formField">
                        <label htmlFor="serviceName">Nome do serviço</label>
                        <input
                          id="serviceName"
                          onChange={(event) => setServiceName(event.target.value)}
                          value={serviceName}
                        />
                      </div>
                      <div className="formField">
                        <label htmlFor="serviceDurationMin">Duração (min)</label>
                        <input
                          id="serviceDurationMin"
                          min={1}
                          onChange={(event) => setServiceDurationMin(Number(event.target.value))}
                          type="number"
                          value={serviceDurationMin}
                        />
                      </div>
                      <div className="formField">
                        <label htmlFor="servicePriceBRL">Preço (R$)</label>
                        <input
                          id="servicePriceBRL"
                          min={0.01}
                          onChange={(event) => setServicePriceBRL(Number(event.target.value))}
                          step="0.01"
                          type="number"
                          value={servicePriceBRL}
                        />
                      </div>
                      <div className="formField">
                        <label htmlFor="serviceDescription">Descrição (opcional)</label>
                        <input
                          id="serviceDescription"
                          onChange={(event) => setServiceDescription(event.target.value)}
                          value={serviceDescription}
                        />
                      </div>
                    </div>
                    <div className="formActions">
                      <button
                        className="btnPrimary"
                        disabled={isSavingService}
                        onClick={() => onCreateService()}
                        type="button"
                      >
                        {isSavingService ? "Salvando..." : "Salvar serviço"}
                      </button>
                      <button className="btnSecondary" onClick={resetServiceFormAndClose} type="button">
                        Cancelar
                      </button>
                      {serviceMessage ? <small>{serviceMessage}</small> : null}
                      {serviceError ? <small style={{ color: "#b42318" }}>{serviceError}</small> : null}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="formField">
                <label htmlFor="appointmentDate">Data</label>
                <input
                  id="appointmentDate"
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  required
                  type="date"
                  value={appointmentDate}
                />
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
                </>
              ) : null}
            </div>

            {canShowAppointmentFields && serviceId ? (
              <small className="subtle" style={{ display: "block", marginTop: "0.15rem" }}>
                Fim calculado automaticamente conforme duração do serviço.
              </small>
            ) : null}

            {canShowAppointmentFields ? (
              <>
                <div className="formField" style={{ marginTop: "0.8rem" }}>
                  <label htmlFor="notes">Observações</label>
                  <textarea id="notes" onChange={(e) => setNotes(e.target.value)} value={notes} />
                </div>

                <div className="formActions">
                  <button className="btnPrimary" disabled={!canSchedule || isSavingAppointment} type="submit">
                    {isSavingAppointment ? "Salvando..." : "Salvar agendamento"}
                  </button>
                  <button className="btnSecondary" onClick={resetAppointmentFormAndClose} type="button">
                    Cancelar
                  </button>
                  {message ? <small>{message}</small> : null}
                  {error ? <small style={{ color: "#b42318" }}>{error}</small> : null}
                </div>
              </>
            ) : (
              <div className="formActions">
                {message ? <small>{message}</small> : null}
                {error ? <small style={{ color: "#b42318" }}>{error}</small> : null}
              </div>
            )}
          </form>
        ) : null}
      </article>

      <article className="panel agendaCalendarPanel">
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
        <div className="agendaLegend" role="note">
          <span className="agendaLegendItem">
            <span className="agendaStatusDot agendaStatusSCHEDULED" /> Agendado
          </span>
          <span className="agendaLegendItem">
            <span className="agendaStatusDot agendaStatusCONFIRMED" /> Confirmado
          </span>
          <span className="agendaLegendItem">
            <span className="agendaStatusDot agendaStatusIN_PROGRESS" /> Em atendimento
          </span>
          <span className="agendaLegendItem">
            <span className="agendaStatusDot agendaStatusCOMPLETED" /> Concluído
          </span>
          <span className="agendaLegendItem">
            <span className="agendaStatusDot agendaStatusCANCELED" /> Cancelado
          </span>
          <span className="agendaLegendDivider">|</span>
          <span className="agendaLegendItem">
            <span className="agendaQuickActionDot agendaQuickActionConfirm" /> Ação iniciar
          </span>
          <span className="agendaLegendItem">
            <span className="agendaQuickActionDot agendaQuickActionComplete" /> Ação encerrar
          </span>
          <span className="agendaLegendItem">
            <span className="agendaQuickActionDot agendaQuickActionCancel" /> Ação cancelar
          </span>
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
                          <div
                            className={`agendaBusinessHourRow ${
                              isAppointmentLate(appointment) ? "agendaLateAppointment" : ""
                            }`}
                            key={appointment.id}
                          >
                            <div className="agendaBusinessHourMain">
                              <span className="agendaBusinessHourLabel">
                                {startsAt.toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                              <span className="agendaBusinessHourPet">
                                {appointment.pet.customer.name} - {appointment.pet.name}
                              </span>
                            </div>
                            <div
                              className={`agendaQuickActions ${
                                useCompactCalendarActions ? "agendaQuickActionsCompact" : ""
                              }`}
                            >
                              <span
                                className={`${
                                  useCompactCalendarActions
                                    ? "agendaStatusDot tooltipTrigger"
                                    : "agendaStatusBadge"
                                } agendaStatus${appointment.status}`}
                                data-tooltip={statusLabelMap[appointment.status]}
                                title={statusLabelMap[appointment.status]}
                              >
                                {useCompactCalendarActions ? "" : statusLabelMap[appointment.status]}
                              </span>
                              {canStartService(appointment) ? (
                                <button
                                  aria-label="Iniciar serviço"
                                  className={`agendaQuickActionBtn agendaQuickActionConfirm ${
                                    useCompactCalendarActions ? "agendaQuickActionDot tooltipTrigger" : ""
                                  }`}
                                  data-tooltip="Iniciar"
                                  disabled={updatingAppointmentId === appointment.id}
                                  onClick={() => updateAppointmentStatus(appointment.id, "IN_PROGRESS")}
                                  title="Iniciar"
                                  type="button"
                                >
                                  {useCompactCalendarActions ? "" : "Iniciar serviço"}
                                </button>
                              ) : null}
                              {canFinishService(appointment) ? (
                                <button
                                  aria-label="Encerrar serviço"
                                  className={`agendaQuickActionBtn agendaQuickActionComplete ${
                                    useCompactCalendarActions ? "agendaQuickActionDot tooltipTrigger" : ""
                                  }`}
                                  data-tooltip="Encerrar"
                                  disabled={updatingAppointmentId === appointment.id}
                                  onClick={() => updateAppointmentStatus(appointment.id, "COMPLETED")}
                                  title="Encerrar"
                                  type="button"
                                >
                                  {useCompactCalendarActions ? "" : "Encerrar"}
                                </button>
                              ) : null}
                              {canCancel(appointment) ? (
                                <button
                                  aria-label="Cancelar agendamento"
                                  className={`agendaQuickActionBtn agendaQuickActionCancel ${
                                    useCompactCalendarActions ? "agendaQuickActionDot tooltipTrigger" : ""
                                  }`}
                                  data-tooltip="Cancelar"
                                  disabled={updatingAppointmentId === appointment.id}
                                  onClick={() => updateAppointmentStatus(appointment.id, "CANCELED")}
                                  title="Cancelar"
                                  type="button"
                                >
                                  {useCompactCalendarActions ? "" : "Cancelar"}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="agendaCalendarAppointments">
                      {items.map((appointment) => {
                        const startsAt = new Date(appointment.startsAt);
                        return (
                          <div
                            className={`agendaCalendarChip ${
                              isAppointmentLate(appointment) ? "agendaLateAppointment" : ""
                            }`}
                            key={appointment.id}
                          >
                            <div className="agendaCalendarChipMain">
                              <span className="agendaCalendarChipText">
                                {startsAt.toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}{" "}
                                · {appointment.pet.customer.name} · {appointment.pet.name} · {appointment.service.name} ·{" "}
                                {formatBRL(appointment.chargedPriceCents ?? 0)}
                              </span>
                              {isAppointmentLate(appointment) ? (
                                <small style={{ color: "#b42318", display: "block" }}>Atrasado</small>
                              ) : null}
                            </div>
                            <div
                              className={`agendaQuickActions ${
                                useCompactCalendarActions ? "agendaQuickActionsCompact" : ""
                              }`}
                            >
                              <span
                                className={`${
                                  useCompactCalendarActions
                                    ? "agendaStatusDot tooltipTrigger"
                                    : "agendaStatusBadge"
                                } agendaStatus${appointment.status}`}
                                data-tooltip={statusLabelMap[appointment.status]}
                                title={statusLabelMap[appointment.status]}
                              >
                                {useCompactCalendarActions ? "" : statusLabelMap[appointment.status]}
                              </span>
                              {canStartService(appointment) ? (
                                <button
                                  aria-label="Iniciar serviço"
                                  className={`agendaQuickActionBtn agendaQuickActionConfirm ${
                                    useCompactCalendarActions ? "agendaQuickActionDot tooltipTrigger" : ""
                                  }`}
                                  data-tooltip="Iniciar"
                                  disabled={updatingAppointmentId === appointment.id}
                                  onClick={() => updateAppointmentStatus(appointment.id, "IN_PROGRESS")}
                                  title="Iniciar"
                                  type="button"
                                >
                                  {useCompactCalendarActions ? "" : "Iniciar serviço"}
                                </button>
                              ) : null}
                              {canFinishService(appointment) ? (
                                <button
                                  aria-label="Encerrar serviço"
                                  className={`agendaQuickActionBtn agendaQuickActionComplete ${
                                    useCompactCalendarActions ? "agendaQuickActionDot tooltipTrigger" : ""
                                  }`}
                                  data-tooltip="Encerrar"
                                  disabled={updatingAppointmentId === appointment.id}
                                  onClick={() => updateAppointmentStatus(appointment.id, "COMPLETED")}
                                  title="Encerrar"
                                  type="button"
                                >
                                  {useCompactCalendarActions ? "" : "Encerrar"}
                                </button>
                              ) : null}
                              {canCancel(appointment) ? (
                                <button
                                  aria-label="Cancelar agendamento"
                                  className={`agendaQuickActionBtn agendaQuickActionCancel ${
                                    useCompactCalendarActions ? "agendaQuickActionDot tooltipTrigger" : ""
                                  }`}
                                  data-tooltip="Cancelar"
                                  disabled={updatingAppointmentId === appointment.id}
                                  onClick={() => updateAppointmentStatus(appointment.id, "CANCELED")}
                                  title="Cancelar"
                                  type="button"
                                >
                                  {useCompactCalendarActions ? "" : "Cancelar"}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
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
