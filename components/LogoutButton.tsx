"use client";

import { useState } from "react";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) {
      return;
    }

    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      try {
        window.localStorage.removeItem("petshop_auth_me");
      } catch {
        // ignora
      }
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <button className="ghostButton" type="button" onClick={handleLogout} disabled={loading}>
      {loading ? "Saindo..." : "Sair"}
    </button>
  );
}
