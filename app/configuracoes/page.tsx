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
        <p className="subtle">Ajuste preferências gerais, comunicação e identidade visual textual.</p>
        <form onSubmit={onSubmit} className="formGrid">
          <div className="formField">
            <label htmlFor="settings-timezone">Timezone</label>
            <input
              id="settings-timezone"
              value={form.timezone ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
            />
          </div>

          <div className="formField formFieldFull">
            <label htmlFor="settings-working-hours">Horários de trabalho</label>
            <textarea
              id="settings-working-hours"
              value={form.workingHours ?? ""}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, workingHours: event.target.value }))
              }
            />
          </div>

          <div className="formField formFieldFull">
            <label htmlFor="settings-branding">Branding</label>
            <textarea
              id="settings-branding"
              value={form.branding ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, branding: event.target.value }))}
            />
          </div>

          <div className="formField formFieldFull">
            <label htmlFor="settings-notifications">Notificações</label>
            <textarea
              id="settings-notifications"
              value={form.notifications ?? ""}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notifications: event.target.value }))
              }
            />
          </div>

          <div className="formActions">
            <button className="btnPrimary" type="submit">
              Salvar configurações
            </button>
            {message ? <small className="subtle">{message}</small> : null}
            {error ? <small style={{ color: "#b42318" }}>{error}</small> : null}
          </div>
        </form>
      </article>

      <article className="panel">
        <h2>Segurança da conta</h2>
        <p className="subtle">Atualize a senha com confirmação para manter o acesso seguro.</p>
        <form onSubmit={onChangePassword} className="formGrid">
          <div className="formField">
            <label htmlFor="settings-current-password">Senha atual</label>
            <input
              id="settings-current-password"
              type="password"
              value={currentPassword}
              autoComplete="current-password"
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </div>

          <div className="formField">
            <label htmlFor="settings-new-password">Nova senha</label>
            <input
              id="settings-new-password"
              type="password"
              value={newPassword}
              autoComplete="new-password"
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>

          <div className="formField formFieldFull">
            <label htmlFor="settings-confirm-password">Confirmar nova senha</label>
            <input
              id="settings-confirm-password"
              type="password"
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

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
