"use client";

import { FormEvent, useEffect, useState } from "react";

type Plan = { id: string; name: string; maxUsers: number | null; maxAppointmentsMonth: number | null };
type Company = {
  id: string;
  name: string;
  slug: string;
  status?: "PENDING" | "ACTIVE" | "SUSPENDED";
  createdAt?: string;
};
type User = {
  id: string;
  name: string;
  email: string;
  status?: "ACTIVE" | "INACTIVE";
  isSystemAdmin?: boolean;
  createdAt?: string;
  memberships?: Array<{
    role: "ADMIN" | "ATTENDANT" | "PROFESSIONAL";
    company: { id: string; name: string; slug: string };
  }>;
};

const roleOptions = [
  { value: "ADMIN", label: "Administrador da empresa" },
  { value: "ATTENDANT", label: "Atendente" },
  { value: "PROFESSIONAL", label: "Profissional" }
] as const;

const subscriptionStatusOptions = [
  { value: "TRIAL", label: "Período de teste" },
  { value: "ACTIVE", label: "Ativa" },
  { value: "PAST_DUE", label: "Pagamento pendente" },
  { value: "CANCELED", label: "Cancelada" }
] as const;

function formatDate(value?: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString("pt-BR");
}

export default function AdminSistemaPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState("");

  const [newPlan, setNewPlan] = useState({ name: "", priceCents: 0, maxUsers: "", maxAppointmentsMonth: "" });
  const [newCompany, setNewCompany] = useState({ name: "", slug: "", planId: "" });
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", isSystemAdmin: false });
  const [newMembership, setNewMembership] = useState({ userId: "", companyId: "", role: "ATTENDANT" });
  const [newSubscription, setNewSubscription] = useState({ companyId: "", planId: "", status: "ACTIVE" });

  async function loadAll() {
    const [plansRes, companiesRes, usersRes] = await Promise.all([
      fetch("/api/system/plans"),
      fetch("/api/system/companies"),
      fetch("/api/system/users")
    ]);

    const [plansPayload, companiesPayload, usersPayload] = await Promise.all([
      plansRes.json().catch(() => ({})),
      companiesRes.json().catch(() => ({})),
      usersRes.json().catch(() => ({}))
    ]);

    setPlans(plansPayload.data ?? []);
    setCompanies(companiesPayload.data ?? []);
    setUsers(usersPayload.data ?? []);
  }

  useEffect(() => {
    loadAll().catch(() => undefined);
  }, []);

  async function submit(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload.error ?? "Falha na operação");
    }
  }

  async function onCreatePlan(event: FormEvent) {
    event.preventDefault();
    try {
      await submit("/api/system/plans", {
        name: newPlan.name,
        priceCents: Number(newPlan.priceCents),
        maxUsers: newPlan.maxUsers ? Number(newPlan.maxUsers) : null,
        maxAppointmentsMonth: newPlan.maxAppointmentsMonth ? Number(newPlan.maxAppointmentsMonth) : null
      });
      setMessage("Plano criado com sucesso.");
      setNewPlan({ name: "", priceCents: 0, maxUsers: "", maxAppointmentsMonth: "" });
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha");
    }
  }

  async function onCreateCompany(event: FormEvent) {
    event.preventDefault();
    try {
      await submit("/api/system/companies", {
        name: newCompany.name,
        slug: newCompany.slug,
        planId: newCompany.planId || null
      });
      setMessage("Empresa criada com sucesso.");
      setNewCompany({ name: "", slug: "", planId: "" });
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha");
    }
  }

  async function onCreateUser(event: FormEvent) {
    event.preventDefault();
    try {
      await submit("/api/system/users", {
        ...newUser
      });
      setMessage("Usuário criado com sucesso.");
      setNewUser({ name: "", email: "", password: "", isSystemAdmin: false });
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha");
    }
  }

  async function onCreateMembership(event: FormEvent) {
    event.preventDefault();
    try {
      await submit("/api/system/memberships", {
        ...newMembership
      });
      setMessage("Vínculo criado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha");
    }
  }

  async function onCreateSubscription(event: FormEvent) {
    event.preventDefault();
    try {
      await submit("/api/system/subscriptions", {
        ...newSubscription
      });
      setMessage("Assinatura criada com sucesso.");
      await loadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha");
    }
  }

  return (
    <section className="panel adminSystemPanel">
      <h2>Administração do sistema</h2>
      {message ? <small className="subtle">{message}</small> : null}

      <div className="adminSystemSection">
        <h3>Estrutura do negócio</h3>
        <p className="subtle">Crie planos, empresas e assinaturas da plataforma.</p>
      </div>
      <div className="adminSystemGrid" style={{ marginTop: 12 }}>
        <article className="card">
          <h3>Novo plano</h3>
          <form onSubmit={onCreatePlan} className="formGrid">
            <label className="formField formFieldFull">
              <span>Nome do plano</span>
              <input placeholder="Ex.: Essencial" value={newPlan.name} onChange={(e) => setNewPlan((s) => ({ ...s, name: e.target.value }))} required />
            </label>
            <label className="formField formFieldFull">
              <span>Preço mensal (em centavos)</span>
              <input type="number" placeholder="Ex.: 9900" value={newPlan.priceCents} onChange={(e) => setNewPlan((s) => ({ ...s, priceCents: Number(e.target.value) }))} required />
            </label>
            <label className="formField formFieldFull">
              <span>Limite de usuários</span>
              <input type="number" placeholder="Ex.: 5" value={newPlan.maxUsers} onChange={(e) => setNewPlan((s) => ({ ...s, maxUsers: e.target.value }))} />
            </label>
            <label className="formField formFieldFull">
              <span>Limite de agendamentos por mês</span>
              <input type="number" placeholder="Ex.: 500" value={newPlan.maxAppointmentsMonth} onChange={(e) => setNewPlan((s) => ({ ...s, maxAppointmentsMonth: e.target.value }))} />
            </label>
            <button className="btnPrimary" type="submit">Criar plano</button>
          </form>
        </article>

        <article className="card">
          <h3>Nova empresa</h3>
          <form onSubmit={onCreateCompany} className="formGrid">
            <label className="formField formFieldFull">
              <span>Nome da empresa</span>
              <input placeholder="Ex.: Pet Feliz" value={newCompany.name} onChange={(e) => setNewCompany((s) => ({ ...s, name: e.target.value }))} required />
            </label>
            <label className="formField formFieldFull">
              <span>Identificador único da empresa</span>
              <input
                placeholder="Ex.: pet-feliz"
                value={newCompany.slug}
                onChange={(e) => setNewCompany((s) => ({ ...s, slug: e.target.value }))}
                required
              />
              <small className="subtle">
                Usado internamente para identificar a empresa no sistema (sem espaços e sem
                acentos).
              </small>
            </label>
            <label className="formField formFieldFull">
              <span>Plano inicial da empresa</span>
              <select value={newCompany.planId} onChange={(e) => setNewCompany((s) => ({ ...s, planId: e.target.value }))}>
                <option value="">Sem plano</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>
            </label>
            <button className="btnPrimary" type="submit">Criar empresa</button>
          </form>
        </article>

        <article className="card">
          <h3>Nova assinatura</h3>
          <form onSubmit={onCreateSubscription} className="formGrid">
            <label className="formField formFieldFull">
              <span>Empresa da assinatura</span>
              <select value={newSubscription.companyId} onChange={(e) => setNewSubscription((s) => ({ ...s, companyId: e.target.value }))} required>
                <option value="">Selecione a empresa</option>
                {companies.map((company) => (<option key={company.id} value={company.id}>{company.name}</option>))}
              </select>
            </label>
            <label className="formField formFieldFull">
              <span>Plano contratado</span>
              <select value={newSubscription.planId} onChange={(e) => setNewSubscription((s) => ({ ...s, planId: e.target.value }))} required>
                <option value="">Selecione o plano</option>
                {plans.map((plan) => (<option key={plan.id} value={plan.id}>{plan.name}</option>))}
              </select>
            </label>
            <label className="formField formFieldFull">
              <span>Status da assinatura</span>
              <select value={newSubscription.status} onChange={(e) => setNewSubscription((s) => ({ ...s, status: e.target.value }))}>
                {subscriptionStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <button className="btnPrimary" type="submit">Criar assinatura</button>
          </form>
        </article>
      </div>

      <div className="adminSystemSection" style={{ marginTop: 20 }}>
        <h3>Acesso e permissões</h3>
        <p className="subtle">Cadastre usuários e vincule cada um à empresa com o perfil correto.</p>
      </div>
      <div className="adminSystemGrid" style={{ marginTop: 12 }}>

        <article className="card">
          <h3>Novo usuário</h3>
          <form onSubmit={onCreateUser} className="formGrid">
            <label className="formField formFieldFull">
              <span>Nome do usuário</span>
              <input placeholder="Ex.: João Silva" value={newUser.name} onChange={(e) => setNewUser((s) => ({ ...s, name: e.target.value }))} required />
            </label>
            <label className="formField formFieldFull">
              <span>E-mail de acesso</span>
              <input type="email" placeholder="usuario@empresa.com" value={newUser.email} onChange={(e) => setNewUser((s) => ({ ...s, email: e.target.value }))} required />
            </label>
            <label className="formField formFieldFull">
              <span>Senha inicial</span>
              <input type="password" placeholder="Mínimo de 6 caracteres" value={newUser.password} onChange={(e) => setNewUser((s) => ({ ...s, password: e.target.value }))} required />
            </label>
            <label className="subtle">
              <input type="checkbox" checked={newUser.isSystemAdmin} onChange={(e) => setNewUser((s) => ({ ...s, isSystemAdmin: e.target.checked }))} />
              {" "}
              Administrador do sistema
            </label>
            <button className="btnPrimary" type="submit">Criar usuário</button>
          </form>
        </article>

        <article className="card">
          <h3>Vincular usuário</h3>
          <form onSubmit={onCreateMembership} className="formGrid">
            <label className="formField formFieldFull">
              <span>Usuário a ser vinculado</span>
              <select value={newMembership.userId} onChange={(e) => setNewMembership((s) => ({ ...s, userId: e.target.value }))} required>
                <option value="">Selecione o usuário</option>
                {users.map((user) => (<option key={user.id} value={user.id}>{user.email}</option>))}
              </select>
            </label>
            <label className="formField formFieldFull">
              <span>Empresa de destino</span>
              <select value={newMembership.companyId} onChange={(e) => setNewMembership((s) => ({ ...s, companyId: e.target.value }))} required>
                <option value="">Selecione a empresa</option>
                {companies.map((company) => (<option key={company.id} value={company.id}>{company.name}</option>))}
              </select>
            </label>
            <label className="formField formFieldFull">
              <span>Perfil de acesso</span>
              <select value={newMembership.role} onChange={(e) => setNewMembership((s) => ({ ...s, role: e.target.value }))}>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <button className="btnPrimary" type="submit">Vincular</button>
          </form>
        </article>
      </div>

      <div className="adminSystemSection" style={{ marginTop: 20 }}>
        <h3>Cadastros existentes</h3>
        <p className="subtle">Visualize rapidamente empresas e usuários já criados no sistema.</p>
      </div>
      <div className="adminSystemGrid" style={{ marginTop: 12 }}>
        <article className="card">
          <h3>Empresas cadastradas</h3>
          {companies.length === 0 ? (
            <p className="subtle">Nenhuma empresa cadastrada.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {companies.map((company) => (
                <div
                  key={company.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 10,
                    display: "grid",
                    gap: 4
                  }}
                >
                  <strong>{company.name}</strong>
                  <small className="subtle">Identificador único: {company.slug}</small>
                  <small className="subtle">Status: {company.status ?? "-"}</small>
                  <small className="subtle">Criada em: {formatDate(company.createdAt)}</small>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="card">
          <h3>Usuários cadastrados</h3>
          {users.length === 0 ? (
            <p className="subtle">Nenhum usuário cadastrado.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {users.map((user) => (
                <div
                  key={user.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 10,
                    padding: 10,
                    display: "grid",
                    gap: 4
                  }}
                >
                  <strong>{user.name}</strong>
                  <small className="subtle">E-mail: {user.email}</small>
                  <small className="subtle">Status: {user.status ?? "-"}</small>
                  <small className="subtle">
                    Tipo: {user.isSystemAdmin ? "Administrador do sistema" : "Usuário da empresa"}
                  </small>
                  <small className="subtle">
                    Empresas:{" "}
                    {user.memberships?.length
                      ? user.memberships
                          .map((membership) => `${membership.company.name} (${membership.role})`)
                          .join(", ")
                      : "-"}
                  </small>
                  <small className="subtle">Criado em: {formatDate(user.createdAt)}</small>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
