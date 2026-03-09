"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type LoginResponse = {
  data?: {
    user: {
      username: string;
      role: string;
    };
    company: {
      id: string;
      slug: string;
      name: string;
    };
  };
  error?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const payload: LoginResponse = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.error ?? "Falha ao entrar.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <section className="loginPage">
      <article className="loginHero">
        <span className="loginBadge">Plataforma de gestão veterinária</span>
        <h1>PetShop SaaS</h1>
        <p>
          Agenda, clientes, estoque e campanhas em um ambiente único para operações
          de petshop e clínica.
        </p>
        <div className="loginThemes" aria-hidden="true">
          <span>🐶 Banho e tosa</span>
          <span>🐱 Cadastro de pets</span>
          <span>🩺 Rotina de cuidados</span>
          <span>🧴 Produtos e estoque</span>
        </div>
      </article>

      <article className="loginCard">
        <h2>Entrar no sistema</h2>
        <p className="subtle">Use seu usuário e senha para acessar o ambiente da empresa.</p>
        <form onSubmit={onSubmit} className="loginForm">
          <label>
            Usuário
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <small style={{ color: "#b42318" }}>{error}</small> : null}

          <button type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </article>
    </section>
  );
}
