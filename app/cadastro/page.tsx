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

  const refreshCustomers = useCallback(async function refreshCustomerList() {
    const customersRes = await fetch("/api/customers", { cache: "no-store" });
    const customersPayload: ApiResponse<Customer[]> = await customersRes.json();
    const nextCustomers = customersPayload.data ?? [];

    setCustomers(nextCustomers);

    if (!newPetCustomerId && nextCustomers.length > 0) {
      setNewPetCustomerId(nextCustomers[0].id);
    }
  }, [newPetCustomerId]);

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
    </section>
  );
}
