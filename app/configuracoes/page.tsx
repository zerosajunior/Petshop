"use client";

import { FormEvent, useEffect, useState } from "react";

type SettingsData = {
  timezone?: string;
  workingHours?: string | null;
  branding?: string | null;
  notifications?: string | null;
};

export default function ConfiguracoesPage() {
  const [form, setForm] = useState<SettingsData>({
    timezone: "America/Sao_Paulo",
    workingHours: "",
    branding: "",
    notifications: ""
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/company-settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (payload.data) {
          setForm({
            timezone: payload.data.timezone ?? "America/Sao_Paulo",
            workingHours: payload.data.workingHours ?? "",
            branding: payload.data.branding ?? "",
            notifications: payload.data.notifications ?? ""
          });
        }
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const response = await fetch("/api/company-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error ?? "Não foi possível salvar configurações.");
      return;
    }

    setMessage("Configurações salvas.");
  }

  return (
    <section className="panel">
      <h2>Configurações da empresa</h2>
      <form onSubmit={onSubmit} className="formGrid">
        <label className="formField">
          Timezone
          <input
            value={form.timezone ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
          />
        </label>

        <label className="formField formFieldFull">
          Horários de trabalho
          <textarea
            value={form.workingHours ?? ""}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, workingHours: event.target.value }))
            }
          />
        </label>

        <label className="formField formFieldFull">
          Branding
          <textarea
            value={form.branding ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, branding: event.target.value }))}
          />
        </label>

        <label className="formField formFieldFull">
          Notificações
          <textarea
            value={form.notifications ?? ""}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, notifications: event.target.value }))
            }
          />
        </label>

        <div className="formActions">
          <button className="btnPrimary" type="submit">
            Salvar
          </button>
          {message ? <small className="subtle">{message}</small> : null}
          {error ? <small style={{ color: "#b42318" }}>{error}</small> : null}
        </div>
      </form>
    </section>
  );
}
