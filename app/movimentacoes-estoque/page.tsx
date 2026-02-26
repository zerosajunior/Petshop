"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ApiResponse } from "@/types/api";

type Product = {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
};

type MovementType = "IN" | "OUT" | "ADJUSTMENT";

type Movement = {
  id: string;
  type: MovementType;
  quantity: number;
  reason: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
};

export default function MovimentacoesEstoquePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [productId, setProductId] = useState("");
  const [type, setType] = useState<MovementType>("IN");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");

  const refresh = useCallback(async function refresh() {
    const [productsRes, movementsRes] = await Promise.all([
      fetch("/api/products", { cache: "no-store" }),
      fetch("/api/stock-movements", { cache: "no-store" })
    ]);

    const productsPayload: ApiResponse<Product[]> = await productsRes.json();
    const movementsPayload: ApiResponse<Movement[]> = await movementsRes.json();

    const nextProducts = productsPayload.data ?? [];
    setProducts(nextProducts);
    setMovements(movementsPayload.data ?? []);

    if (!productId && nextProducts.length > 0) {
      setProductId(nextProducts[0].id);
    }
  }, [productId]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!productId) {
      setError("Selecione um produto para movimentar.");
      return;
    }

    if (type !== "ADJUSTMENT" && quantity <= 0) {
      setError("Quantidade deve ser maior que zero.");
      return;
    }

    if (type === "ADJUSTMENT" && quantity === 0) {
      setError("Em ajuste, informe quantidade diferente de zero.");
      return;
    }

    const response = await fetch("/api/stock-movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        type,
        quantity,
        reason: reason || undefined
      })
    });

    const payload: ApiResponse<unknown> = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Não foi possível registrar a movimentação.");
      return;
    }

    setMessage("Movimentação registrada com sucesso.");
    setQuantity(1);
    setReason("");
    await refresh();
  }

  return (
    <section>
      <h2>Movimentação de estoque</h2>
      <p className="subtle">Registre entradas, saídas e ajustes de quantidade.</p>

      <article className="panel">
        <div className="pageActions appActionBar">
          <Link className="btnPrimary appActionMain" href="/estoque">
            Produtos
          </Link>
          <Link className="btnSecondary appActionBack" href="/">
            Voltar ao painel
          </Link>
        </div>

        <form onSubmit={onSubmit}>
          <div className="formGrid">
            <div className="formField">
              <label htmlFor="productId">Produto</label>
              <select id="productId" onChange={(e) => setProductId(e.target.value)} value={productId}>
                <option value="">Selecione</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku}) - estoque {product.currentStock}
                  </option>
                ))}
              </select>
            </div>
            <div className="formField">
              <label htmlFor="type">Tipo</label>
              <select id="type" onChange={(e) => setType(e.target.value as MovementType)} value={type}>
                <option value="IN">Entrada</option>
                <option value="OUT">Saída</option>
                <option value="ADJUSTMENT">Ajuste (+/-)</option>
              </select>
            </div>
            <div className="formField">
              <label htmlFor="quantity">Quantidade {type === "ADJUSTMENT" ? "(aceita negativo)" : ""}</label>
              <input
                id="quantity"
                onChange={(e) => setQuantity(Number(e.target.value))}
                step={1}
                type="number"
                value={quantity}
              />
            </div>
            <div className="formField">
              <label htmlFor="reason">Motivo (opcional)</label>
              <input id="reason" onChange={(e) => setReason(e.target.value)} value={reason} />
            </div>
          </div>

          <div className="formActions">
            <button className="btnPrimary" type="submit">
              Registrar movimentação
            </button>
            {message ? <small>{message}</small> : null}
            {error ? <small style={{ color: "#b42318" }}>{error}</small> : null}
          </div>
        </form>
      </article>

      <article className="panel">
        <h3>Últimas movimentações</h3>
        <ul className="listSimple">
          {movements.map((movement) => (
            <li key={movement.id}>
              [{new Date(movement.createdAt).toLocaleString("pt-BR")}] {movement.product.name} ({movement.product.sku}) -
              {" "}
              {movement.type === "IN" ? "Entrada" : movement.type === "OUT" ? "Saída" : "Ajuste"}
              {" "}
              {movement.quantity}
              {movement.reason ? ` - ${movement.reason}` : ""}
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
