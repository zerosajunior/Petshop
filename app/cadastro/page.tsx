"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ApiResponse } from "@/types/api";

type PetType = "DOG" | "CAT" | "BIRD" | "OTHER";
type PetSize = "SMALL" | "MEDIUM" | "LARGE";
type Channel = "SMS" | "WHATSAPP";

type CustomerListItem = {
  id: string;
  name: string;
  phone: string;
  zipCode: string;
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  addressComplement?: string | null;
  pets: Array<{ id: string; name: string; isDeceased?: boolean | null }>;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCep(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) {
    return digits;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatAddressLine(customer: CustomerListItem) {
  const parts = [customer.street, customer.number, customer.neighborhood, customer.city, customer.state]
    .map((part) => (part ?? "").trim())
    .filter(Boolean);
  return parts.join(" - ");
}

export default function CadastroPage() {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerZipCode, setCustomerZipCode] = useState("");
  const [customerStreet, setCustomerStreet] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [customerNeighborhood, setCustomerNeighborhood] = useState("");
  const [customerCity, setCustomerCity] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [customerAddressComplement, setCustomerAddressComplement] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerChannel, setCustomerChannel] = useState<Channel>("WHATSAPP");
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const [newPetCustomerId, setNewPetCustomerId] = useState("");
  const [newPetName, setNewPetName] = useState("");
  const [newPetType, setNewPetType] = useState<PetType>("DOG");
  const [newPetBreed, setNewPetBreed] = useState("");
  const [newPetSize, setNewPetSize] = useState<PetSize>("MEDIUM");
  const [newPetIsDeceased, setNewPetIsDeceased] = useState(false);

  const [consentCustomerId, setConsentCustomerId] = useState("");
  const [consentChannel, setConsentChannel] = useState<Channel>("WHATSAPP");
  const [consentCode, setConsentCode] = useState("");
  const [consentMessage, setConsentMessage] = useState("");
  const [consentError, setConsentError] = useState("");

  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [lastCreatedCustomerId, setLastCreatedCustomerId] = useState("");

  const refreshCustomers = useCallback(async function refreshCustomerList() {
    const customersRes = await fetch("/api/customers", { cache: "no-store" });
    const customersPayload: ApiResponse<CustomerListItem[]> = await customersRes.json();
    const nextCustomers = customersPayload.data ?? [];

    setCustomers(nextCustomers);

  }, []);

  useEffect(() => {
    refreshCustomers().catch(() => undefined);
  }, [refreshCustomers]);

  const customerPreview = useMemo(
    () => ({
      name: customerName.trim() || "-",
      phone: customerPhone.trim() || "-",
      zipCode: customerZipCode.trim() || "-",
      street: customerStreet.trim() || "-",
      number: customerNumber.trim() || "-",
      neighborhood: customerNeighborhood.trim() || "-",
      city: customerCity.trim() || "-",
      state: customerState.trim() || "-",
      addressComplement: customerAddressComplement.trim() || "-",
      email: customerEmail.trim() || "-",
      preferredChannel: customerChannel === "WHATSAPP" ? "WhatsApp" : "SMS"
    }),
    [
      customerAddressComplement,
      customerChannel,
      customerCity,
      customerEmail,
      customerName,
      customerNeighborhood,
      customerNumber,
      customerPhone,
      customerState,
      customerStreet,
      customerZipCode
    ]
  );

  function clearCustomerForm() {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerZipCode("");
    setCustomerStreet("");
    setCustomerNumber("");
    setCustomerNeighborhood("");
    setCustomerCity("");
    setCustomerState("");
    setCustomerAddressComplement("");
    setCustomerEmail("");
    setCustomerChannel("WHATSAPP");
  }

  function clearPetForm() {
    setNewPetName("");
    setNewPetType("DOG");
    setNewPetBreed("");
    setNewPetSize("MEDIUM");
    setNewPetIsDeceased(false);
  }

  async function fillAddressFromCep(cepValue: string) {
    const cepDigits = onlyDigits(cepValue);
    if (cepDigits.length !== 8) {
      return;
    }

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`, {
        method: "GET"
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (payload.erro) {
        setError("CEP não encontrado. Você pode preencher o endereço manualmente.");
        return;
      }
      setCustomerStreet(payload.logradouro ?? "");
      setCustomerNeighborhood(payload.bairro ?? "");
      setCustomerCity(payload.localidade ?? "");
      setCustomerState(payload.uf ?? "");
    } catch {
      // Sem bloqueio: usuário ainda pode preencher o endereço manualmente.
    } finally {
      setIsLoadingCep(false);
    }
  }

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
        zipCode: onlyDigits(customerZipCode),
        street: customerStreet || undefined,
        number: customerNumber || undefined,
        neighborhood: customerNeighborhood || undefined,
        city: customerCity || undefined,
        state: customerState || undefined,
        addressComplement: customerAddressComplement || undefined,
        email: customerEmail || undefined,
        preferredChannel: customerChannel
      })
    });

    const payload: ApiResponse<{ id: string }> = await response.json();
    if (!response.ok || !payload.data) {
      setError(payload.error ?? "Não foi possível criar o cliente.");
      return;
    }

    clearCustomerForm();
    setNewPetCustomerId(payload.data.id);
    setConsentCustomerId(payload.data.id);
    setLastCreatedCustomerId(payload.data.id);
    setMessage("Cliente criado com sucesso.");
    await refreshCustomers();
  }

  async function onCreatePet(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!newPetCustomerId) {
      setError("Selecione o cliente para vincular o pet.");
      return;
    }

    const response = await fetch("/api/pets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: newPetCustomerId,
        name: newPetName,
        type: newPetType,
        breed: newPetBreed || undefined,
        size: newPetSize,
        isDeceased: newPetIsDeceased
      })
    });

    const payload: ApiResponse<{ id: string }> = await response.json();
    if (!response.ok || !payload.data) {
      setError(payload.error ?? "Não foi possível criar o pet.");
      return;
    }

    clearPetForm();
    setMessage("Pet criado com sucesso.");
    await refreshCustomers();
  }

  async function onRequestConsent() {
    setConsentMessage("");
    setConsentError("");
    if (!consentCustomerId) {
      setConsentError("Selecione o cliente para enviar o código.");
      return;
    }

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
    if (!consentCustomerId) {
      setConsentError("Selecione o cliente antes de confirmar o consentimento.");
      return;
    }

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

  function resetRegistrationFormAndClose() {
    clearCustomerForm();
    clearPetForm();
    setMessage("");
    setError("");
    setIsRegistrationOpen(false);
  }

  function resetConsentFormAndClose() {
    setConsentCode("");
    setConsentMessage("");
    setConsentError("");
    setIsConsentOpen(false);
  }

  return (
    <section>
      <h2>Cadastros</h2>
      <p className="subtle">Gerencie clientes, pets e consentimento em uma tela dedicada.</p>

      <article className="panel">
        <div className="pageActions appActionBar">
          <button
            className="btnSecondary appActionAux"
            onClick={() => {
              if (isRegistrationOpen) {
                resetRegistrationFormAndClose();
                return;
              }
              setMessage("");
              setError("");
              setIsRegistrationOpen(true);
            }}
            type="button"
          >
            {isRegistrationOpen ? "Fechar cadastro" : "Novo cadastro"}
          </button>
          <Link className="btnPrimary appActionMain" href="/agenda">
            Ir para agendamento
          </Link>
          <Link className="btnSecondary appActionAux" href="/servicos">
            Ir para serviços
          </Link>
          <Link className="btnSecondary appActionBack" href="/">
            Voltar ao painel
          </Link>
        </div>

        {isRegistrationOpen ? (
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
                <label htmlFor="customerZipCode">CEP (obrigatório)</label>
                <input
                  id="customerZipCode"
                  maxLength={9}
                  onBlur={(e) => {
                    fillAddressFromCep(e.target.value).catch(() => undefined);
                  }}
                  onChange={(e) => {
                    setCustomerZipCode(formatCep(e.target.value));
                    setError("");
                  }}
                  placeholder="00000-000"
                  required
                  value={customerZipCode}
                />
                {isLoadingCep ? <small className="subtle">Buscando endereço pelo CEP...</small> : null}
              </div>
              <div className="formField">
                <label htmlFor="customerStreet">Endereço</label>
                <input
                  id="customerStreet"
                  onChange={(e) => setCustomerStreet(e.target.value)}
                  value={customerStreet}
                />
              </div>
              <div className="formField">
                <label htmlFor="customerNumber">Número</label>
                <input
                  id="customerNumber"
                  onChange={(e) => setCustomerNumber(e.target.value)}
                  value={customerNumber}
                />
              </div>
              <div className="formField">
                <label htmlFor="customerNeighborhood">Bairro</label>
                <input
                  id="customerNeighborhood"
                  onChange={(e) => setCustomerNeighborhood(e.target.value)}
                  value={customerNeighborhood}
                />
              </div>
              <div className="formField">
                <label htmlFor="customerCity">Cidade</label>
                <input id="customerCity" onChange={(e) => setCustomerCity(e.target.value)} value={customerCity} />
              </div>
              <div className="formField">
                <label htmlFor="customerState">UF</label>
                <input
                  id="customerState"
                  maxLength={2}
                  onChange={(e) => setCustomerState(e.target.value.toUpperCase())}
                  value={customerState}
                />
              </div>
              <div className="formField">
                <label htmlFor="customerAddressComplement">Complemento (opcional)</label>
                <input
                  id="customerAddressComplement"
                  onChange={(e) => setCustomerAddressComplement(e.target.value)}
                  value={customerAddressComplement}
                />
              </div>
              <div className="formField">
                <label htmlFor="customerEmail">E-mail (opcional)</label>
                <input id="customerEmail" onChange={(e) => setCustomerEmail(e.target.value)} value={customerEmail} />
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
                <button className="btnSecondary" onClick={clearCustomerForm} type="button">
                  Limpar
                </button>
              </div>
            </form>

            <aside className="stackForm" style={{ alignSelf: "start", background: "#f8fafc" }}>
              <h3 style={{ marginTop: 0 }}>Pré-visualização do cliente</h3>
              <small>Nome: {customerPreview.name}</small>
              <small>Telefone: {customerPreview.phone}</small>
              <small>CEP: {customerPreview.zipCode}</small>
              <small>
                Endereço: {customerPreview.street}, {customerPreview.number}
              </small>
              <small>
                Bairro/Cidade-UF: {customerPreview.neighborhood} - {customerPreview.city}/{customerPreview.state}
              </small>
              <small>Complemento: {customerPreview.addressComplement}</small>
              <small>E-mail: {customerPreview.email}</small>
              <small>Canal: {customerPreview.preferredChannel}</small>
              <div className="formActions" style={{ marginTop: "0.4rem" }}>
                <button
                  className="btnSecondary"
                  disabled={!lastCreatedCustomerId}
                  onClick={() => {
                    if (!lastCreatedCustomerId) {
                      return;
                    }
                    setNewPetCustomerId(lastCreatedCustomerId);
                    clearPetForm();
                  }}
                  type="button"
                >
                  Novo pet para este cliente
                </button>
              </div>
            </aside>

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
                <input id="newPetName" onChange={(e) => setNewPetName(e.target.value)} required value={newPetName} />
              </div>
              <div className="formField">
                <label htmlFor="newPetType">Tipo</label>
                <select id="newPetType" onChange={(e) => setNewPetType(e.target.value as PetType)} value={newPetType}>
                  <option value="DOG">Cão</option>
                  <option value="CAT">Gato</option>
                  <option value="BIRD">Ave</option>
                  <option value="OTHER">Outro</option>
                </select>
              </div>
              <div className="formField">
                <label htmlFor="newPetBreed">Raça</label>
                <input id="newPetBreed" onChange={(e) => setNewPetBreed(e.target.value)} value={newPetBreed} />
              </div>
              <div className="formField">
                <label htmlFor="newPetSize">Porte</label>
                <select id="newPetSize" onChange={(e) => setNewPetSize(e.target.value as PetSize)} value={newPetSize}>
                  <option value="SMALL">Pequeno</option>
                  <option value="MEDIUM">Médio</option>
                  <option value="LARGE">Grande</option>
                </select>
              </div>
              <div className="formActions">
                <label>
                  <input
                    checked={newPetIsDeceased}
                    onChange={(event) => setNewPetIsDeceased(event.target.checked)}
                    style={{ marginRight: "0.4rem" }}
                    type="checkbox"
                  />
                  Marcar como falecido
                </label>
              </div>
              <div className="formActions">
                <button className="btnPrimary" disabled={customers.length === 0} type="submit">
                  Salvar pet
                </button>
                <button className="btnSecondary" onClick={clearPetForm} type="button">
                  Limpar
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {isRegistrationOpen && message ? <small>{message}</small> : null}
        {isRegistrationOpen && error ? (
          <small style={{ color: "#b42318", display: "block" }}>{error}</small>
        ) : null}
      </article>

      <article className="panel">
        <h3>Clientes e pets</h3>
        <ul className="listSimple">
          {customers.slice(0, 8).map((customer) => (
            <li key={customer.id}>
              <strong>{customer.name}</strong> - {customer.phone} - CEP {formatCep(customer.zipCode)}
              {formatAddressLine(customer) ? ` - ${formatAddressLine(customer)}` : ""}
              {customer.pets.length > 0
                ? ` - Pets: ${customer.pets
                    .map((pet) => `${pet.name}${pet.isDeceased ? " (falecido)" : ""}`)
                    .join(", ")}`
                : " - Sem pets"}
            </li>
          ))}
        </ul>
      </article>

      <article className="panel">
        <h3>Consentimento de marketing (LGPD)</h3>
        <p className="subtle">
          Envie o código ao celular do cliente e confirme apenas após ele informar o código recebido.
        </p>

        <div className="pageActions" style={{ marginTop: "0.4rem" }}>
          <button
            className="btnSecondary"
            onClick={() => {
              if (isConsentOpen) {
                resetConsentFormAndClose();
                return;
              }
              setConsentMessage("");
              setConsentError("");
              setIsConsentOpen(true);
            }}
            type="button"
          >
            {isConsentOpen ? "Fechar consentimento" : "Abrir consentimento"}
          </button>
        </div>

        {isConsentOpen ? (
          <>
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
          </>
        ) : null}
      </article>
    </section>
  );
}
