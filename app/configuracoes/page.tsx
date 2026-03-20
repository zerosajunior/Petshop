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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

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

  async function onChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Preencha todos os campos de senha.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("A nova senha deve ter ao menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("A confirmação da nova senha não confere.");
      return;
    }

    setChangingPassword(true);
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const payload = await response.json().catch(() => ({}));
    setChangingPassword(false);

    if (!response.ok) {
      setPasswordError(payload.error ?? "Não foi possível alterar a senha.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Senha alterada com sucesso.");
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <article className="panel">
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
      </article>

      <article className="panel">
        <h2>Segurança da conta</h2>
        <form onSubmit={onChangePassword} className="formGrid">
          <label className="formField">
            Senha atual
            <input
              type="password"
              value={currentPassword}
              autoComplete="current-password"
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>

          <label className="formField">
            Nova senha
            <input
              type="password"
              value={newPassword}
              autoComplete="new-password"
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>

          <label className="formField formFieldFull">
            Confirmar nova senha
            <input
              type="password"
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>

          <div className="formActions">
            <button className="btnPrimary" type="submit" disabled={changingPassword}>
              {changingPassword ? "Salvando..." : "Alterar senha"}
            </button>
            {passwordMessage ? <small className="subtle">{passwordMessage}</small> : null}
            {passwordError ? <small style={{ color: "#b42318" }}>{passwordError}</small> : null}
          </div>
        </form>
      </article>
    </section>
  );
}
