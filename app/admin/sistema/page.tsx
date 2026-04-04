"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";

type Plan = { id: string; name: string; maxUsers: number | null; maxAppointmentsMonth: number | null };
type Company = {
  id: string;
  name: string;
  slug: string;
  logoDataUrl?: string | null;
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

const companyStatusOptions = [
  { value: "PENDING", label: "Pendente" },
  { value: "ACTIVE", label: "Ativa" },
  { value: "SUSPENDED", label: "Suspensa" }
] as const;

const userStatusOptions = [
  { value: "ACTIVE", label: "Ativo" },
  { value: "INACTIVE", label: "Inativo" }
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

function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function readImageAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Falha ao carregar imagem."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("Falha ao carregar imagem."));
    reader.readAsDataURL(file);
  });
}

export default function AdminSistemaPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState("");

  const [newPlan, setNewPlan] = useState({ name: "", priceCents: 0, maxUsers: "", maxAppointmentsMonth: "" });
  const [newCompany, setNewCompany] = useState({ name: "", slug: "", planId: "", logoDataUrl: "" });
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", isSystemAdmin: false });
  const [newMembership, setNewMembership] = useState({ userId: "", companyId: "", role: "ATTENDANT" });
  const [newSubscription, setNewSubscription] = useState({ companyId: "", planId: "", status: "ACTIVE" });
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [companyDraft, setCompanyDraft] = useState({
    name: "",
    slug: "",
    status: "ACTIVE",
    planId: "",
    logoDataUrl: ""
  });
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userDraft, setUserDraft] = useState({
    name: "",
    email: "",
    status: "ACTIVE",
    isSystemAdmin: false,
    newPassword: ""
  });
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const [businessAction, setBusinessAction] = useState<"plan" | "company" | "subscription" | null>(null);
  const [accessAction, setAccessAction] = useState<"user" | "membership" | null>(null);
  const [registrySection, setRegistrySection] = useState<"companies" | "users" | null>(null);
  const [onboardingCompany, setOnboardingCompany] = useState<{ id: string; name: string } | null>(null);

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

  useEffect(() => {
    if (!selectedCompanyId) {
      return;
    }
    const selected = companies.find((company) => company.id === selectedCompanyId);
    if (!selected) {
      setSelectedCompanyId("");
      setCompanyDraft({ name: "", slug: "", status: "ACTIVE", planId: "", logoDataUrl: "" });
    }
  }, [companies, selectedCompanyId]);

  useEffect(() => {
    if (!selectedUserId) {
      return;
    }
    const selected = users.find((user) => user.id === selectedUserId);
    if (!selected) {
      setSelectedUserId("");
      setUserDraft({ name: "", email: "", status: "ACTIVE", isSystemAdmin: false, newPassword: "" });
    }
  }, [users, selectedUserId]);

  async function submit<T>(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload.error ?? "Falha na operação");
    }
    return payload.data as T;
  }

  async function patch(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload.error ?? "Falha na atualização");
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
      setBusinessAction(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha");
    }
  }

  async function onCreateCompany(event: FormEvent) {
    event.preventDefault();
    const normalizedSlug = normalizeSlug(newCompany.slug || newCompany.name);
    if (!normalizedSlug) {
      setMessage("Informe um nome/identificador válido para a empresa.");
      return;
    }

    setIsSubmittingCompany(true);
    try {
      const createdCompany = await submit<Company>("/api/system/companies", {
        name: newCompany.name.trim(),
        slug: normalizedSlug,
        planId: newCompany.planId || null,
        logoDataUrl: newCompany.logoDataUrl || null
      });
      setMessage("Empresa criada. Próximo passo: criar e vincular o usuário administrador.");
      setNewCompany({ name: "", slug: "", planId: "", logoDataUrl: "" });
      await loadAll();
      setBusinessAction(null);
      setAccessAction("user");
      setOnboardingCompany({ id: createdCompany.id, name: createdCompany.name });
      setNewMembership((prev) => ({ ...prev, companyId: createdCompany.id }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha");
    } finally {
      setIsSubmittingCompany(false);
    }
  }

  async function onCreateUser(event: FormEvent) {
    event.preventDefault();
    try {
      const createdUser = await submit<User>("/api/system/users", {
        ...newUser
      });
      setNewUser({ name: "", email: "", password: "", isSystemAdmin: false });
      await loadAll();
      if (onboardingCompany) {
        setMessage(`Usuário criado. Falta apenas vincular à empresa ${onboardingCompany.name}.`);
        setAccessAction("membership");
        setNewMembership((prev) => ({
          ...prev,
          userId: createdUser.id,
          companyId: onboardingCompany.id,
          role: "ADMIN"
        }));
        return;
      }
      setMessage("Usuário criado com sucesso.");
      setAccessAction(null);
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
      if (onboardingCompany && newMembership.companyId === onboardingCompany.id) {
        setMessage("Cadastro concluído: empresa criada e usuário administrador vinculado.");
        setOnboardingCompany(null);
      } else {
        setMessage("Vínculo criado com sucesso.");
      }
      setNewMembership((prev) => ({ ...prev, userId: "", role: "ATTENDANT" }));
      setAccessAction(null);
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
      setBusinessAction(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha");
    }
  }

  function onSelectCompany(company: Company) {
    setSelectedCompanyId(company.id);
    setCompanyDraft({
      name: company.name,
      slug: company.slug,
      status: company.status ?? "ACTIVE",
      planId: "",
      logoDataUrl: company.logoDataUrl ?? ""
    });
  }

  function onSelectUser(user: User) {
    setSelectedUserId(user.id);
    setUserDraft({
      name: user.name,
      email: user.email,
      status: user.status ?? "ACTIVE",
      isSystemAdmin: Boolean(user.isSystemAdmin),
      newPassword: ""
    });
  }

  async function onUpdateCompany(event: FormEvent) {
    event.preventDefault();
    if (!selectedCompanyId) {
      setMessage("Selecione uma empresa para editar.");
      return;
    }
    const normalizedSlug = normalizeSlug(companyDraft.slug);
    if (!normalizedSlug) {
      setMessage("Identificador da empresa inválido.");
      return;
    }

    try {
      await patch(`/api/system/companies/${selectedCompanyId}`, {
        name: companyDraft.name.trim(),
        slug: normalizedSlug,
        status: companyDraft.status,
        logoDataUrl: companyDraft.logoDataUrl || null
      });
      setMessage("Empresa atualizada com sucesso.");
      await loadAll();
      setRegistrySection(null);
      setSelectedCompanyId("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha");
    }
  }

  async function onUpdateUser(event: FormEvent) {
    event.preventDefault();
    if (!selectedUserId) {
      setMessage("Selecione um usuário para editar.");
      return;
    }

    try {
      await patch(`/api/system/users/${selectedUserId}`, {
        name: userDraft.name,
        email: userDraft.email,
        status: userDraft.status,
        isSystemAdmin: userDraft.isSystemAdmin,
        newPassword: userDraft.newPassword || undefined
      });
      setMessage("Usuário atualizado com sucesso.");
      setUserDraft((prev) => ({ ...prev, newPassword: "" }));
      await loadAll();
      setRegistrySection(null);
      setSelectedUserId("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha");
    }
  }

  function onToggleRegistrySection(section: "companies" | "users") {
    setRegistrySection((prev) => (prev === section ? null : section));
  }

  async function onChangeNewCompanyLogo(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Selecione um arquivo de imagem válido para o logotipo.");
      return;
    }

    try {
      const dataUrl = await readImageAsDataUrl(file);
      setNewCompany((prev) => ({ ...prev, logoDataUrl: dataUrl }));
      setMessage("Logotipo carregado para a nova empresa.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar logotipo.");
    }
  }

  async function onChangeDraftCompanyLogo(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage("Selecione um arquivo de imagem válido para o logotipo.");
      return;
    }

    try {
      const dataUrl = await readImageAsDataUrl(file);
      setCompanyDraft((prev) => ({ ...prev, logoDataUrl: dataUrl }));
      setMessage("Logotipo da empresa atualizado localmente. Clique em salvar para confirmar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar logotipo.");
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
      <div className="appActionBar adminActionBar" style={{ marginTop: 12 }}>
        <button
          type="button"
          className={`btnPrimary actionBtnSameHeight adminActionToggle ${businessAction === "plan" ? "adminActionToggleActive" : ""}`}
          onClick={() => setBusinessAction("plan")}
        >
          Novo plano
        </button>
        <button
          type="button"
          className={`btnPrimary actionBtnSameHeight adminActionToggle ${businessAction === "company" ? "adminActionToggleActive" : ""}`}
          onClick={() => setBusinessAction("company")}
        >
          Nova empresa
        </button>
        <button
          type="button"
          className={`btnPrimary actionBtnSameHeight adminActionToggle ${businessAction === "subscription" ? "adminActionToggleActive" : ""}`}
          onClick={() => setBusinessAction("subscription")}
        >
          Nova assinatura
        </button>
      </div>
      <div className="adminSystemGrid" style={{ marginTop: 12 }}>
        {businessAction === "plan" ? (
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
        ) : null}

        {businessAction === "company" ? (
          <article className="card">
            <h3>Nova empresa</h3>
            <form onSubmit={onCreateCompany} className="formGrid">
              <label className="formField formFieldFull">
                <span>Nome da empresa</span>
                <input placeholder="Ex.: Pet Feliz" value={newCompany.name} onChange={(e) => setNewCompany((s) => ({ ...s, name: e.target.value }))} required />
              </label>
              <label className="formField formFieldFull">
                <span>Identificador único da empresa</span>
                <div className="fieldInlineAction">
                  <input
                    placeholder="Ex.: pet-feliz"
                    value={newCompany.slug}
                    onChange={(e) =>
                      setNewCompany((s) => ({ ...s, slug: normalizeSlug(e.target.value) }))
                    }
                    required
                  />
                  <button
                    type="button"
                    className="btnSecondary"
                    onClick={() =>
                      setNewCompany((s) => ({ ...s, slug: normalizeSlug(s.slug || s.name) }))
                    }
                  >
                    Gerar do nome
                  </button>
                </div>
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
              <label className="formField formFieldFull">
                <span>Logotipo da empresa</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => onChangeNewCompanyLogo(event.target.files?.[0] ?? null)}
                />
                <small className="subtle">
                  O sistema mostra o logotipo no topo sempre em preto, sem alterar as cores da interface.
                </small>
              </label>
              {newCompany.logoDataUrl ? (
                <div className="formField formFieldFull">
                  <Image
                    className="adminCompanyLogoPreview"
                    src={newCompany.logoDataUrl}
                    alt="Prévia do logotipo da empresa"
                    width={120}
                    height={120}
                    unoptimized
                  />
                  <button
                    className="btnSecondary"
                    type="button"
                    onClick={() => setNewCompany((prev) => ({ ...prev, logoDataUrl: "" }))}
                    style={{ marginTop: 8 }}
                  >
                    Remover logotipo
                  </button>
                </div>
              ) : null}
              <button className="btnPrimary" type="submit" disabled={isSubmittingCompany}>
                {isSubmittingCompany ? "Criando..." : "Criar empresa"}
              </button>
            </form>
          </article>
        ) : null}

        {businessAction === "subscription" ? (
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
        ) : null}
      </div>

      <div className="adminSystemSection" style={{ marginTop: 20 }}>
        <h3>Acesso e permissões</h3>
        <p className="subtle">Cadastre usuários e vincule cada um à empresa com o perfil correto.</p>
        {onboardingCompany ? (
          <small className="subtle">
            Fluxo guiado ativo para <strong>{onboardingCompany.name}</strong>: criar usuário e
            vincular como administrador.
          </small>
        ) : null}
      </div>
      <div className="appActionBar adminActionBar" style={{ marginTop: 12 }}>
        <button
          type="button"
          className={`btnPrimary actionBtnSameHeight adminActionToggle ${accessAction === "user" ? "adminActionToggleActive" : ""}`}
          onClick={() => setAccessAction("user")}
        >
          Novo usuário
        </button>
        <button
          type="button"
          className={`btnPrimary actionBtnSameHeight adminActionToggle ${accessAction === "membership" ? "adminActionToggleActive" : ""}`}
          onClick={() => setAccessAction("membership")}
        >
          Vincular usuário
        </button>
      </div>
      <div className="adminSystemGrid" style={{ marginTop: 12 }}>
        {accessAction === "user" ? (
          <article className="card">
            <h3>Novo usuário</h3>
            {onboardingCompany ? (
              <p className="subtle">
                Este usuário será usado no onboarding da empresa <strong>{onboardingCompany.name}</strong>.
              </p>
            ) : null}
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
        ) : null}

        {accessAction === "membership" ? (
          <article className="card">
            <h3>Vincular usuário</h3>
            {onboardingCompany ? (
              <p className="subtle">
                Finalize o onboarding vinculando o usuário à empresa <strong>{onboardingCompany.name}</strong>.
              </p>
            ) : null}
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
        ) : null}
      </div>

      <div className="adminSystemSection" style={{ marginTop: 20 }}>
        <h3>Cadastros existentes</h3>
        <p className="subtle">Escolha uma seção para expandir e editar os dados.</p>
      </div>
      <div className="appActionBar adminActionBar" style={{ marginTop: 12 }}>
        <button
          type="button"
          className={`btnPrimary actionBtnSameHeight adminActionToggle ${registrySection === "companies" ? "adminActionToggleActive" : ""}`}
          onClick={() => onToggleRegistrySection("companies")}
        >
          Empresas
        </button>
        <button
          type="button"
          className={`btnPrimary actionBtnSameHeight adminActionToggle ${registrySection === "users" ? "adminActionToggleActive" : ""}`}
          onClick={() => onToggleRegistrySection("users")}
        >
          Usuários
        </button>
      </div>
      {registrySection === "companies" ? (
        <div className="adminListLayoutTwoCols" style={{ marginTop: 12 }}>
          <article className="panel adminListPanel">
            <h3>Empresas cadastradas</h3>
            {companies.length === 0 ? (
              <p className="subtle">Nenhuma empresa cadastrada.</p>
            ) : (
              <div className="adminRows">
                {companies.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    className={`adminRow ${selectedCompanyId === company.id ? "isActive" : ""}`}
                    onClick={() => onSelectCompany(company)}
                  >
                    <strong>{company.name}</strong>
                    <small className="subtle">Identificador: {company.slug}</small>
                    <small className="subtle">Logotipo: {company.logoDataUrl ? "Configurado" : "Não configurado"}</small>
                    <small className="subtle">Status: {company.status ?? "-"}</small>
                    <small className="subtle">Criada em: {formatDate(company.createdAt)}</small>
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="panel adminListPanel">
            <h3>Editar empresa selecionada</h3>
            {!selectedCompanyId ? (
              <p className="subtle">Clique em uma empresa na lista para editar.</p>
            ) : (
              <form onSubmit={onUpdateCompany} className="formGrid">
                <label className="formField formFieldFull">
                  <span>Nome da empresa</span>
                  <input
                    value={companyDraft.name}
                    onChange={(event) =>
                      setCompanyDraft((prev) => ({ ...prev, name: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="formField formFieldFull">
                  <span>Identificador único da empresa</span>
                  <input
                    value={companyDraft.slug}
                    onChange={(event) =>
                      setCompanyDraft((prev) => ({ ...prev, slug: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="formField formFieldFull">
                  <span>Status</span>
                  <select
                    value={companyDraft.status}
                    onChange={(event) =>
                      setCompanyDraft((prev) => ({ ...prev, status: event.target.value }))
                    }
                  >
                    {companyStatusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="formField formFieldFull">
                  <span>Logotipo da empresa</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => onChangeDraftCompanyLogo(event.target.files?.[0] ?? null)}
                  />
                </label>
                {companyDraft.logoDataUrl ? (
                  <div className="formField formFieldFull">
                    <Image
                      className="adminCompanyLogoPreview"
                      src={companyDraft.logoDataUrl}
                      alt="Prévia do logotipo da empresa"
                      width={120}
                      height={120}
                      unoptimized
                    />
                    <button
                      className="btnSecondary"
                      type="button"
                      onClick={() => setCompanyDraft((prev) => ({ ...prev, logoDataUrl: "" }))}
                      style={{ marginTop: 8 }}
                    >
                      Remover logotipo
                    </button>
                  </div>
                ) : null}
                <button className="btnPrimary" type="submit">
                  Salvar empresa
                </button>
              </form>
            )}
          </article>
        </div>
      ) : null}

      {registrySection === "users" ? (
        <div className="adminListLayoutTwoCols" style={{ marginTop: 12 }}>
          <article className="panel adminListPanel">
            <h3>Usuários cadastrados</h3>
            {users.length === 0 ? (
              <p className="subtle">Nenhum usuário cadastrado.</p>
            ) : (
              <div className="adminRows">
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className={`adminRow ${selectedUserId === user.id ? "isActive" : ""}`}
                    onClick={() => onSelectUser(user)}
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
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="panel adminListPanel">
            <h3>Editar usuário selecionado</h3>
            {!selectedUserId ? (
              <p className="subtle">Clique em um usuário na lista para editar.</p>
            ) : (
              <form onSubmit={onUpdateUser} className="formGrid">
                <label className="formField formFieldFull">
                  <span>Nome</span>
                  <input
                    value={userDraft.name}
                    onChange={(event) =>
                      setUserDraft((prev) => ({ ...prev, name: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="formField formFieldFull">
                  <span>E-mail</span>
                  <input
                    type="email"
                    value={userDraft.email}
                    onChange={(event) =>
                      setUserDraft((prev) => ({ ...prev, email: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="formField formFieldFull">
                  <span>Status</span>
                  <select
                    value={userDraft.status}
                    onChange={(event) =>
                      setUserDraft((prev) => ({ ...prev, status: event.target.value }))
                    }
                  >
                    {userStatusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="subtle">
                  <input
                    type="checkbox"
                    checked={userDraft.isSystemAdmin}
                    onChange={(event) =>
                      setUserDraft((prev) => ({ ...prev, isSystemAdmin: event.target.checked }))
                    }
                  />
                  {" "}
                  Administrador do sistema
                </label>
                <label className="formField formFieldFull">
                  <span>Nova senha (opcional)</span>
                  <input
                    type="password"
                    value={userDraft.newPassword}
                    onChange={(event) =>
                      setUserDraft((prev) => ({ ...prev, newPassword: event.target.value }))
                    }
                    placeholder="Preencha apenas se quiser resetar a senha"
                  />
                </label>
                <button className="btnPrimary" type="submit">
                  Salvar usuário
                </button>
              </form>
            )}
          </article>
        </div>
      ) : null}
    </section>
  );
}
