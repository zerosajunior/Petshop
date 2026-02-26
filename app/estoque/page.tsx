"use client";

import { useEffect, useState } from "react";
import type { ApiResponse } from "@/types/api";
import Image from "next/image";
import Link from "next/link";

type ProductImage = {
  id: string;
  dataUrl: string;
  position: number;
};

type Product = {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  imageDataUrl?: string | null;
  images?: ProductImage[];
  currentStock: number;
  minStock: number;
  priceCents: number;
};

function ProductPhotoCarousel({ images, name }: { images: ProductImage[]; name: string }) {
  const [index, setIndex] = useState(0);
  const total = images.length;
  const current = images[index];

  if (total === 0) {
    return null;
  }

  return (
    <span className="productGalleryInline">
      <Image
        alt={`Foto de ${name}`}
        className="productInlineThumb"
        height={34}
        src={current.dataUrl}
        unoptimized
        width={34}
      />
      {total > 1 ? (
        <>
          <button
            className="galleryNavBtn"
            onClick={() => setIndex((prev) => (prev === 0 ? total - 1 : prev - 1))}
            type="button"
          >
            ‹
          </button>
          <small className="subtle">
            {index + 1}/{total}
          </small>
          <button
            className="galleryNavBtn"
            onClick={() => setIndex((prev) => (prev === total - 1 ? 0 : prev + 1))}
            type="button"
          >
            ›
          </button>
        </>
      ) : null}
    </span>
  );
}

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
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

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

    if (!name.trim()) {
      setError("Informe o nome do produto.");
      return;
    }

    if (!sku.trim()) {
      setError("Informe o código interno (SKU).");
      return;
    }

    if (priceBRL <= 0) {
      setError("O preço deve ser maior que zero.");
      return;
    }

    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        category: category.trim() || undefined,
        description: description || undefined,
        imageDataUrls: photoPreviews.length > 0 ? photoPreviews : undefined,
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
    setPhotoPreviews([]);
    setPreviewIndex(0);
    await refresh();
  }

  function onPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      setPhotoPreviews([]);
      setPreviewIndex(0);
      return;
    }

    if (files.length > 8) {
      setError("Selecione no máximo 8 fotos por produto.");
      setPhotoPreviews([]);
      setPreviewIndex(0);
      return;
    }

    const hasOversized = files.some((file) => file.size > 1_500_000);
    if (hasOversized) {
      setError("Uma ou mais fotos são grandes demais. Limite de 1.5 MB por foto.");
      setPhotoPreviews([]);
      setPreviewIndex(0);
      return;
    }

    setError("");
    Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === "string") {
                resolve(reader.result);
                return;
              }
              reject(new Error("Imagem inválida."));
            };
            reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
            reader.readAsDataURL(file);
          })
      )
    )
      .then((images) => {
        setPhotoPreviews(images);
        setPreviewIndex(0);
      })
      .catch(() => {
        setError("Não foi possível ler as fotos selecionadas.");
      });
  }

  return (
    <section>
      <h2>Produtos</h2>
      <p className="subtle">Cadastre produtos e mantenha o catálogo de estoque.</p>

      <article className="panel">
        <div className="pageActions appActionBar">
          <Link className="btnPrimary appActionMain" href="/movimentacoes-estoque">
            Ir para estoque
          </Link>
          <Link className="btnSecondary appActionBack" href="/">
            Voltar ao painel
          </Link>
        </div>

        <form onSubmit={onSubmit}>
          <div className="productFormLayout">
            <div className="productPhotoField">
              <label>Pré-visualização da foto</label>
              <div className="productPhotoPreview">
                {photoPreviews.length > 0 ? (
                  <Image
                    alt={`Prévia do produto ${previewIndex + 1}`}
                    className="imagePreview"
                    fill
                    src={photoPreviews[previewIndex]}
                    unoptimized
                  />
                ) : (
                  <span className="subtle">Sem foto selecionada</span>
                )}
              </div>
              {photoPreviews.length > 1 ? (
                <div className="galleryControls">
                  <button
                    className="btnSecondary"
                    onClick={() =>
                      setPreviewIndex((prev) => (prev === 0 ? photoPreviews.length - 1 : prev - 1))
                    }
                    type="button"
                  >
                    Anterior
                  </button>
                  <small className="subtle">
                    {previewIndex + 1} de {photoPreviews.length}
                  </small>
                  <button
                    className="btnSecondary"
                    onClick={() =>
                      setPreviewIndex((prev) => (prev === photoPreviews.length - 1 ? 0 : prev + 1))
                    }
                    type="button"
                  >
                    Próxima
                  </button>
                </div>
              ) : null}
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
                  <label htmlFor="productPhoto">Fotos do produto (opcional)</label>
                  <div className="uploadRow">
                    <label className="uploadButton" htmlFor="productPhoto">
                      Selecionar fotos
                    </label>
                    <small className="subtle uploadFileName">
                      {photoPreviews.length > 0
                        ? `${photoPreviews.length} foto(s) selecionada(s)`
                        : "Nenhuma foto selecionada"}
                    </small>
                  </div>
                  <input
                    accept="image/*"
                    className="fileInputHidden"
                    id="productPhoto"
                    multiple
                    onChange={onPhotoChange}
                    type="file"
                  />
                </div>
                <Link className="btnSecondary actionBtnEqual" href="/movimentacoes-estoque">
                  Estoque
                </Link>
                <button className="btnPrimary actionBtnEqual" type="submit">
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
              <ProductPhotoCarousel images={product.images ?? []} name={product.name} />
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
