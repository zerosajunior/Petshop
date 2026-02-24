"use client";

import { useEffect, useState } from "react";
import type { ApiResponse } from "@/types/api";

type Product = {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minStock: number;
  priceCents: number;
};

export default function EstoquePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [currentStock, setCurrentStock] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [priceCents, setPriceCents] = useState(0);

  async function refresh() {
    const response = await fetch("/api/products", { cache: "no-store" });
    const payload: ApiResponse<Product[]> = await response.json();
    setProducts(payload.data ?? []);
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        sku,
        category,
        currentStock,
        minStock,
        priceCents
      })
    });

    const payload: ApiResponse<unknown> = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Não foi possível salvar o produto.");
      return;
    }

    setMessage("Produto criado com sucesso.");
    setName("");
    setSku("");
    setCategory("");
    setCurrentStock(0);
    setMinStock(0);
    setPriceCents(0);
    await refresh();
  }

  return (
    <section>
      <h2>Novo produto</h2>
      <p className="subtle">Cadastre produtos de estoque por aqui.</p>

      <article className="panel">
        <form onSubmit={onSubmit}>
          <div className="formGrid">
            <div className="formField">
              <label htmlFor="name">Nome</label>
              <input id="name" onChange={(e) => setName(e.target.value)} required value={name} />
            </div>
            <div className="formField">
              <label htmlFor="sku">SKU</label>
              <input id="sku" onChange={(e) => setSku(e.target.value)} required value={sku} />
            </div>
            <div className="formField">
              <label htmlFor="category">Categoria</label>
              <input id="category" onChange={(e) => setCategory(e.target.value)} value={category} />
            </div>
            <div className="formField">
              <label htmlFor="currentStock">Estoque atual</label>
              <input
                id="currentStock"
                min={0}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
                required
                type="number"
                value={currentStock}
              />
            </div>
            <div className="formField">
              <label htmlFor="minStock">Estoque mínimo</label>
              <input
                id="minStock"
                min={0}
                onChange={(e) => setMinStock(Number(e.target.value))}
                required
                type="number"
                value={minStock}
              />
            </div>
            <div className="formField">
              <label htmlFor="priceCents">Preço (centavos)</label>
              <input
                id="priceCents"
                min={1}
                onChange={(e) => setPriceCents(Number(e.target.value))}
                required
                type="number"
                value={priceCents}
              />
            </div>
          </div>

          <div className="formActions">
            <button className="btnPrimary" type="submit">
              Salvar produto
            </button>
            {message ? <small>{message}</small> : null}
            {error ? <small style={{ color: "#b42318" }}>{error}</small> : null}
          </div>
        </form>
      </article>

      <article className="panel">
        <h3>Produtos cadastrados</h3>
        <ul className="listSimple">
          {products.slice(0, 10).map((product) => (
            <li key={product.id}>
              {product.name} ({product.sku}) - estoque {product.currentStock}/{product.minStock}
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
