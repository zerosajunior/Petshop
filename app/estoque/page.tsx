"use client";

import { useEffect, useState } from "react";
import type { ApiResponse } from "@/types/api";
import Image from "next/image";

type Product = {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
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
  const [description, setDescription] = useState("");
  const [currentStock, setCurrentStock] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [priceBRL, setPriceBRL] = useState(0);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoFileName, setPhotoFileName] = useState("");

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
        description: description || undefined,
        currentStock,
        minStock,
        priceCents: Math.round(priceBRL * 100)
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
    setDescription("");
    setCurrentStock(0);
    setMinStock(0);
    setPriceBRL(0);
    setPhotoPreview("");
    setPhotoFileName("");
    await refresh();
  }

  function onPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setPhotoPreview("");
      setPhotoFileName("");
      return;
    }

    setPhotoFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoPreview(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  }

  return (
    <section>
      <h2>Novo produto</h2>
      <p className="subtle">Cadastre produtos de estoque por aqui.</p>

      <article className="panel">
        <form onSubmit={onSubmit}>
          <div className="productFormLayout">
            <div className="productPhotoField">
              <label>Pré-visualização da foto</label>
              <div className="productPhotoPreview">
                {photoPreview ? (
                  <Image
                    alt="Prévia do produto"
                    className="imagePreview"
                    fill
                    src={photoPreview}
                    unoptimized
                  />
                ) : (
                  <span className="subtle">Sem foto selecionada</span>
                )}
              </div>
            </div>

            <div className="productFields">
              <div className="formField">
                <label htmlFor="name">Nome</label>
                <input id="name" onChange={(e) => setName(e.target.value)} required value={name} />
              </div>
              <div className="formField">
                <label htmlFor="sku">Código interno do produto (SKU)</label>
                <input id="sku" onChange={(e) => setSku(e.target.value)} required value={sku} />
              </div>
              <div className="formField">
                <label htmlFor="category">Categoria</label>
                <input id="category" onChange={(e) => setCategory(e.target.value)} value={category} />
              </div>
              <div className="formField formFieldFull">
                <label htmlFor="description">Descrição breve</label>
                <textarea
                  id="description"
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex.: Ração premium para cães adultos"
                  rows={2}
                  value={description}
                />
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
                <label htmlFor="priceBRL">Preço (R$)</label>
                <input
                  id="priceBRL"
                  min={0.01}
                  onChange={(e) => setPriceBRL(Number(e.target.value))}
                  required
                  step="0.01"
                  type="number"
                  value={priceBRL}
                />
              </div>
              <div className="formFieldFull photoActionRow">
                <div className="formField photoFieldBlock">
                  <label htmlFor="productPhoto">Foto do produto (opcional)</label>
                  <div className="uploadRow">
                    <label className="uploadButton" htmlFor="productPhoto">
                      Selecionar foto
                    </label>
                    <small className="subtle uploadFileName">
                      {photoFileName || "Nenhuma foto selecionada"}
                    </small>
                  </div>
                  <input
                    accept="image/*"
                    className="fileInputHidden"
                    id="productPhoto"
                    onChange={onPhotoChange}
                    type="file"
                  />
                </div>
                <button className="btnPrimary" type="submit">
                  Salvar produto
                </button>
              </div>
            </div>
          </div>

          <div className="formActions" style={{ marginTop: "0.5rem" }}>
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
              {product.name} ({product.sku}){" "}
              {product.description ? `- ${product.description} ` : ""}- estoque {product.currentStock}/
              {product.minStock} - R${" "}
              {(product.priceCents / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
