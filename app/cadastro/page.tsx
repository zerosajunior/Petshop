"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ApiResponse } from "@/types/api";

type Customer = { id: string; name: string; phone: string };

type Channel = "SMS" | "WHATSAPP";
type PetType = "DOG" | "CAT" | "BIRD" | "OTHER";

export default function CadastroPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerChannel, setCustomerChannel] = useState<Channel>("WHATSAPP");

  const [newPetCustomerId, setNewPetCustomerId] = useState("");
  const [newPetName, setNewPetName] = useState("");
  const [newPetType, setNewPetType] = useState<PetType>("DOG");
  const [consentCustomerId, setConsentCustomerId] = useState("");
  const [consentChannel, setConsentChannel] = useState<Channel>("WHATSAPP");
  const [consentCode, setConsentCode] = useState("");
  const [consentMessage, setConsentMessage] = useState("");
  const [consentError, setConsentError] = useState("");

  const refreshCustomers = useCallback(async function refreshCustomerList() {
    const customersRes = await fetch("/api/customers", { cache: "no-store" });
    const customersPayload: ApiResponse<Customer[]> = await customersRes.json();
    const nextCustomers = customersPayload.data ?? [];

    setCustomers(nextCustomers);

    if (!newPetCustomerId && nextCustomers.length > 0) {
      setNewPetCustomerId(nextCustomers[0].id);
    }
    if (!consentCustomerId && nextCustomers.length > 0) {
      setConsentCustomerId(nextCustomers[0].id);
    }
  }, [consentCustomerId, newPetCustomerId]);

  useEffect(() => {
    refreshCustomers().catch(() => undefined);
  }, [refreshCustomers]);

  async function onCreateCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: customerName,
        phone: customerPhone,
        email: customerEmail || undefined,
        preferredChannel: customerChannel
      })
    });

    const payload: ApiResponse<Customer> = await response.json();
    if (!response.ok || !payload.data) {
      setError(payload.error ?? "Não foi possível criar o cliente.");
      return;
    }

    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setNewPetCustomerId(payload.data.id);
    setConsentCustomerId(payload.data.id);
    setMessage("Cliente criado com sucesso.");
    await refreshCustomers();
  }

  async function onCreatePet(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const response = await fetch("/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: newPetCustomerId,
        name: newPetName,
        type: newPetType
      })
    });

    const payload: ApiResponse<{ id: string }> = await response.json();
    if (!response.ok || !payload.data) {
      setError(payload.error ?? "Não foi possível criar o pet.");
      return;
    }

    setNewPetName("");
    setMessage("Pet criado com sucesso.");
    await refreshCustomers();
  }

  async function onRequestConsent() {
    setConsentMessage("");
    setConsentError("");

    const response = await fetch("/api/privacy/marketing-consent/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: consentCustomerId,
        channel: consentChannel
      })
    });

    const payload: ApiResponse<{ expiresAt: string }> = await response.json();
    if (!response.ok) {
      setConsentError(payload.error ?? "Falha ao enviar código.");
      return;
    }

    const expiresAt = payload.data?.expiresAt
      ? new Date(payload.data.expiresAt).toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit"
        })
      : "";
    setConsentMessage(`Código enviado com sucesso. Expira às ${expiresAt}.`);
  }

  async function onConfirmConsent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConsentMessage("");
    setConsentError("");

    const response = await fetch("/api/privacy/marketing-consent/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: consentCustomerId,
        code: consentCode
      })
    });

    const payload: ApiResponse<{ success: boolean }> = await response.json();
    if (!response.ok) {
      setConsentError(payload.error ?? "Falha ao confirmar consentimento.");
      return;
    }

    setConsentCode("");
    setConsentMessage("Consentimento de marketing confirmado.");
  }

  return (
    <section>
      <h2>Novo cadastro</h2>
      <p className="subtle">Cadastre clientes e pets em uma tela dedicada.</p>

      <article className="panel">
        <div className="pageActions">
          <Link className="btnPrimary" href="/agenda">
            Ir para agendamento
          </Link>
          <Link className="btnSecondary" href="/">
            Voltar ao painel
          </Link>
        </div>

        <div className="formGrid" style={{ marginTop: "0.6rem" }}>
          <form className="stackForm" onSubmit={onCreateCustomer}>
            <div className="formField">
              <label htmlFor="customerName">Novo cliente</label>
              <input
                id="customerName"
                onChange={(e) => setCustomerName(e.target.value)}
                required
                value={customerName}
              />
            </div>
            <div className="formField">
              <label htmlFor="customerPhone">Telefone</label>
              <input
                id="customerPhone"
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                value={customerPhone}
              />
            </div>
            <div className="formField">
              <label htmlFor="customerEmail">E-mail (opcional)</label>
              <input
                id="customerEmail"
                onChange={(e) => setCustomerEmail(e.target.value)}
                value={customerEmail}
              />
            </div>
            <div className="formField">
              <label htmlFor="customerChannel">Canal preferido</label>
              <select
                id="customerChannel"
                onChange={(e) => setCustomerChannel(e.target.value as Channel)}
                value={customerChannel}
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="SMS">SMS</option>
              </select>
            </div>
            <small className="subtle">
              O consentimento de marketing é confirmado por código enviado ao celular do cliente.
            </small>
            <div className="formActions">
              <button className="btnPrimary" type="submit">
                Salvar cliente
              </button>
            </div>
          </form>

          <form className="stackForm" onSubmit={onCreatePet}>
            <div className="formField">
              <label htmlFor="newPetCustomerId">Novo pet para</label>
              <select
                id="newPetCustomerId"
                onChange={(e) => setNewPetCustomerId(e.target.value)}
                required
                value={newPetCustomerId}
              >
                <option value="">Selecione o cliente</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="formField">
              <label htmlFor="newPetName">Nome do pet</label>
              <input
                id="newPetName"
                onChange={(e) => setNewPetName(e.target.value)}
                required
                value={newPetName}
              />
            </div>
            <div className="formField">
              <label htmlFor="newPetType">Tipo</label>
              <select
                id="newPetType"
                onChange={(e) => setNewPetType(e.target.value as PetType)}
                value={newPetType}
              >
                <option value="DOG">Cão</option>
                <option value="CAT">Gato</option>
                <option value="BIRD">Ave</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>
            <div className="formActions">
              <button className="btnPrimary" disabled={customers.length === 0} type="submit">
                Salvar pet
              </button>
            </div>
          </form>

        </div>

        {message ? <small>{message}</small> : null}
        {error ? <small style={{ color: "#b42318", display: "block" }}>{error}</small> : null}
      </article>

      <article className="panel">
        <h3>Consentimento de marketing (LGPD)</h3>
        <p className="subtle">
          Envie o código ao celular do cliente e confirme apenas após ele informar o código recebido.
        </p>

        <div className="formGrid">
          <div className="formField">
            <label htmlFor="consentCustomerId">Cliente</label>
            <select
              id="consentCustomerId"
              onChange={(e) => setConsentCustomerId(e.target.value)}
              value={consentCustomerId}
            >
              <option value="">Selecione o cliente</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="formField">
            <label htmlFor="consentChannel">Canal de envio</label>
            <select
              id="consentChannel"
              onChange={(e) => setConsentChannel(e.target.value as Channel)}
              value={consentChannel}
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="SMS">SMS</option>
            </select>
          </div>

          <div className="formActions">
            <button className="btnSecondary" onClick={onRequestConsent} type="button">
              Enviar código
            </button>
          </div>
        </div>

        <form className="formActions" onSubmit={onConfirmConsent}>
          <div className="formField" style={{ minWidth: "180px" }}>
            <label htmlFor="consentCode">Código de confirmação</label>
            <input
              id="consentCode"
              maxLength={6}
              onChange={(e) => setConsentCode(e.target.value.replace(/\D/g, ""))}
              pattern="\d{6}"
              required
              value={consentCode}
            />
          </div>
          <button className="btnPrimary" type="submit">
            Confirmar consentimento
          </button>
        </form>

        {consentMessage ? <small>{consentMessage}</small> : null}
        {consentError ? (
          <small style={{ color: "#b42318", display: "block" }}>{consentError}</small>
        ) : null}
      </article>
    </section>
  );
}
