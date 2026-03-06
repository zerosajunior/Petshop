"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  category?: string | null;
  description?: string | null;
  imageDataUrl?: string | null;
  images?: ProductImage[];
  currentStock: number;
  minStock: number;
  priceCents: number;
  archivedAt?: string | null;
};

const CATEGORY_OPTIONS = [
  { label: "Higiene e cuidados", icon: "🧴", hint: "Shampoo, perfumes e limpeza diária" },
  { label: "Escovação e cuidados com o pelo", icon: "🪮", hint: "Escovas, pentes e corte de unha" },
  { label: "Acessórios", icon: "🐕", hint: "Coleiras, guias, peitorais e roupas" },
  { label: "Alimentação e petiscos", icon: "🍖", hint: "Petiscos, snacks e ração" },
  { label: "Saúde básica e controle de pragas", icon: "🐾", hint: "Antipulgas, vermífugos e suplementos" },
  { label: "Brinquedos", icon: "🧸", hint: "Bolinhas, mordedores e interativos" }
] as const;

function ProductPhotoCarousel({ images, name }: { images: ProductImage[]; name: string }) {
  const total = images.length;
  const current = images[0];

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
    </span>
  );
}

function ProductPhotoPanel({ images, name }: { images: ProductImage[]; name: string }) {
  const [index, setIndex] = useState(0);
  const total = images.length;
  const current = images[index];

  if (total === 0) {
    return <p className="subtle" style={{ margin: 0 }}>Produto sem fotos cadastradas.</p>;
  }

  return (
    <div className="productExpandedMedia">
      <div className="productExpandedImageWrap">
        <Image
          alt={`Foto de ${name}`}
          className="imagePreview"
          fill
          src={current.dataUrl}
          unoptimized
        />
      </div>
      {total > 1 ? (
        <div className="productExpandedMediaActions">
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
        </div>
      ) : null}
    </div>
  );
}

function formatCentsToBRLInput(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function parseBRLInputToCents(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return NaN;
  }
  return Math.round(parsed * 100);
}

function cleanSeedLabel(value?: string | null) {
  return (value ?? "").replace(/^\[seed-demo\]\s*/i, "").trim();
}

function normalizeCategory(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function maskBRLInput(rawValue: string) {
  const digitsOnly = rawValue.replace(/\D/g, "");
  const cents = Number(digitsOnly || "0");
  return formatCentsToBRLInput(cents);
}

async function readFileAsDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Imagem inválida."));
    };
    reader.onerror = () => reject(new Error("Falha ao ler imagem."));
    reader.readAsDataURL(file);
  });
}

async function compressImageFile(file: File) {
  const sourceDataUrl = await readFileAsDataURL(file);
  const image = document.createElement("img");

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Não foi possível abrir a imagem."));
    image.src = sourceDataUrl;
  });

  const maxSize = 1280;
  let targetWidth = image.naturalWidth;
  let targetHeight = image.naturalHeight;

  if (targetWidth > maxSize || targetHeight > maxSize) {
    if (targetWidth >= targetHeight) {
      targetHeight = Math.round((targetHeight * maxSize) / targetWidth);
      targetWidth = maxSize;
    } else {
      targetWidth = Math.round((targetWidth * maxSize) / targetHeight);
      targetHeight = maxSize;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    return sourceDataUrl;
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);
  const compressed = canvas.toDataURL("image/jpeg", 0.82);

  if (compressed.length >= sourceDataUrl.length) {
    return sourceDataUrl;
  }

  return compressed;
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
  const [priceInput, setPriceInput] = useState("0,00");
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [editingProductId, setEditingProductId] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedProductId, setExpandedProductId] = useState("");

  const refresh = useCallback(async (deletedOnly = showDeleted) => {
    const status = deletedOnly ? "deleted" : "active";
    const response = await fetch(`/api/products?status=${status}`, {
      cache: "no-store"
    });
    const payload: ApiResponse<Product[]> = await response.json();
    setProducts(payload.data ?? []);
  }, [showDeleted]);

  useEffect(() => {
    refresh(showDeleted).catch(() => undefined);
  }, [refresh, showDeleted]);

  function resetProductFormAndClose() {
    setName("");
    setSku("");
    setCategory("");
    setDescription("");
    setCurrentStock(0);
    setMinStock(0);
    setPriceInput("0,00");
    setPhotoPreviews([]);
    setPreviewIndex(0);
    setEditingProductId("");
    setMessage("");
    setError("");
    setIsProductFormOpen(false);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingProduct) {
      return;
    }

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

    if (minStock > currentStock) {
      setError("Estoque mínimo não pode ser maior que o estoque atual no cadastro.");
      return;
    }

    const priceCents = parseBRLInputToCents(priceInput);
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      setError("Informe um preço válido maior que zero.");
      return;
    }

    setIsSavingProduct(true);
    try {
      const endpoint = editingProductId ? `/api/products/${editingProductId}` : "/api/products";
      const method = editingProductId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          category: category.trim() || undefined,
          description: description.trim() || undefined,
          imageDataUrls: photoPreviews.length > 0 ? photoPreviews : undefined,
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

      setMessage(editingProductId ? "Produto atualizado com sucesso." : "Produto criado com sucesso.");
      setName("");
      setSku("");
      setCategory("");
      setDescription("");
      setCurrentStock(0);
      setMinStock(0);
      setPriceInput("0,00");
      setPhotoPreviews([]);
      setPreviewIndex(0);
      setEditingProductId("");
      await refresh(showDeleted);
    } catch {
      setError("Falha de conexão ao salvar o produto.");
    } finally {
      setIsSavingProduct(false);
    }
  }

  async function onPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
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

    setError("");
    try {
      const compressed = await Promise.all(files.map((file) => compressImageFile(file)));
      setPhotoPreviews(compressed);
      setPreviewIndex(0);
    } catch {
      setError("Não foi possível processar as fotos selecionadas.");
    }
  }

  function onEditProduct(product: Product) {
    setMessage("");
    setError("");
    setIsProductFormOpen(true);
    setEditingProductId(product.id);

    setName(product.name);
    setSku(product.sku);
    setCategory(product.category ?? "");
    setDescription(cleanSeedLabel(product.description));
    setCurrentStock(product.currentStock);
    setMinStock(product.minStock);
    setPriceInput(formatCentsToBRLInput(product.priceCents));

    const images = (product.images ?? []).map((item) => item.dataUrl);
    if (images.length > 0) {
      setPhotoPreviews(images);
    } else if (product.imageDataUrl) {
      setPhotoPreviews([product.imageDataUrl]);
    } else {
      setPhotoPreviews([]);
    }
    setPreviewIndex(0);
  }

  async function onToggleDeleted(product: Product) {
    setMessage("");
    setError("");

    const isDeleted = Boolean(product.archivedAt);
    const response = await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !isDeleted })
    });

    const payload: ApiResponse<unknown> = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Não foi possível alterar o status do produto.");
      return;
    }

    setMessage(isDeleted ? "Produto restaurado." : "Produto excluído da lista.");
    await refresh(showDeleted);
  }

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const normalizedCategory = normalizeCategory(product.category);
        if (selectedCategory !== "all") {
          if (selectedCategory === "uncategorized") {
            if (normalizedCategory) {
              return false;
            }
          } else if (normalizedCategory !== selectedCategory) {
            return false;
          }
        }

        if (!searchTerm.trim()) {
          return true;
        }

        const term = searchTerm.toLowerCase();
        return (
          product.name.toLowerCase().includes(term) ||
          product.sku.toLowerCase().includes(term) ||
          (product.description ?? "").toLowerCase().includes(term)
        );
      }),
    [products, searchTerm, selectedCategory]
  );
  const categoryCounters = useMemo(() => {
    const counts = new Map<string, number>();
    let uncategorized = 0;

    products.forEach((product) => {
      const normalized = normalizeCategory(product.category);
      if (!normalized) {
        uncategorized += 1;
        return;
      }
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    });

    return { counts, uncategorized };
  }, [products]);
  const lowStockAlerts = useMemo(
    () =>
      products
        .filter((product) => !product.archivedAt && product.currentStock < product.minStock)
        .sort(
          (a, b) =>
            a.currentStock - a.minStock - (b.currentStock - b.minStock)
        ),
    [products]
  );

  const activeCategoryLabel =
    showDeleted
      ? "Excluídos"
      : selectedCategory === "all"
      ? "Todas as categorias"
      : selectedCategory === "uncategorized"
        ? "Sem categoria"
        : CATEGORY_OPTIONS.find((item) => normalizeCategory(item.label) === selectedCategory)?.label ??
          "Categorias";

  return (
    <section>
      <h2>Produtos</h2>
      <p className="subtle">Cadastre produtos e mantenha o catálogo de estoque.</p>

      <article className="panel">
        <div className="pageActions appActionBar productToolboxRow">
          <input
            className="toolboxSearchInput"
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Pesquisar por nome, SKU ou descrição"
            value={searchInput}
          />
          <button
            aria-label="Pesquisar"
            className="btnSecondary appActionAux iconSearchBtn tooltipTrigger"
            data-tooltip="Pesquisar"
            onClick={() => setSearchTerm(searchInput.trim())}
            title="Pesquisar"
            type="button"
          >
            🔍
          </button>
          <button
            aria-label="Limpar"
            className="btnSecondary appActionAux iconClearBtn tooltipTrigger"
            data-tooltip="Limpar"
            onClick={() => {
              setSearchInput("");
              setSearchTerm("");
            }}
            title="Limpar"
            type="button"
          >
            Limpar
          </button>
          <button
            className="btnSecondary appActionAux"
            onClick={() => {
              if (isProductFormOpen && !editingProductId) {
                resetProductFormAndClose();
                return;
              }
              if (isProductFormOpen && editingProductId) {
                resetProductFormAndClose();
                return;
              }
              setMessage("");
              setError("");
              setIsProductFormOpen(true);
            }}
            type="button"
          >
            {isProductFormOpen ? "Fechar produto" : "Novo produto"}
          </button>
          <button
            className="btnSecondary appActionAux"
            onClick={() => setShowDeleted((prev) => !prev)}
            type="button"
          >
            {showDeleted ? "Mostrar ativos" : "Mostrar excluídos"}
          </button>
          <Link className="btnPrimary appActionMain" href="/movimentacoes-estoque">
            Ir para estoque
          </Link>
          <Link className="btnSecondary appActionBack" href="/">
            Voltar ao painel
          </Link>
        </div>

        {isProductFormOpen ? (
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
                  <input
                    id="category"
                    list="productCategoryOptions"
                    onChange={(e) => setCategory(e.target.value)}
                    value={category}
                  />
                  <datalist id="productCategoryOptions">
                    {CATEGORY_OPTIONS.map((item) => (
                      <option key={item.label} value={item.label} />
                    ))}
                  </datalist>
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
                    inputMode="numeric"
                    onChange={(e) => setPriceInput(maskBRLInput(e.target.value))}
                    required
                    value={priceInput}
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
                  <button className="btnPrimary actionBtnEqual" disabled={isSavingProduct} type="submit">
                    {isSavingProduct
                      ? "Salvando..."
                      : editingProductId
                        ? "Salvar alterações"
                        : "Salvar produto"}
                  </button>
                </div>
              </div>
            </div>

            <div className="formActions" style={{ marginTop: "0.5rem" }}>
              {message ? <small>{message}</small> : null}
              {error ? <small style={{ color: "#b42318" }}>{error}</small> : null}
            </div>
          </form>
        ) : null}
      </article>

      <div className="productTopSplit">
        <article className="panel productCategoryPanel">
          <h3>Categorias de produtos</h3>
          <div className="categoryToolboxCards">
            <button
              className={`categoryToolboxCard ${selectedCategory === "all" ? "categoryToolboxCardActive" : ""}`}
              onClick={() => setSelectedCategory("all")}
              type="button"
            >
              <span className="categoryToolboxIcon">📦</span>
              <span className="categoryToolboxLabel">Todas</span>
              <small className="subtle">Todos os produtos</small>
              <strong>{products.length}</strong>
            </button>
            {CATEGORY_OPTIONS.map((categoryOption) => {
              const normalized = normalizeCategory(categoryOption.label);
              const count = categoryCounters.counts.get(normalized) ?? 0;
              return (
                <button
                  className={`categoryToolboxCard ${
                    selectedCategory === normalized ? "categoryToolboxCardActive" : ""
                  }`}
                  key={categoryOption.label}
                  onClick={() => setSelectedCategory(normalized)}
                  type="button"
                >
                  <span className="categoryToolboxIcon">{categoryOption.icon}</span>
                  <span className="categoryToolboxLabel">{categoryOption.label}</span>
                  <small className="subtle">{categoryOption.hint}</small>
                  <strong>{count}</strong>
                </button>
              );
            })}
            <button
              className={`categoryToolboxCard ${
                selectedCategory === "uncategorized" ? "categoryToolboxCardActive" : ""
              }`}
              onClick={() => setSelectedCategory("uncategorized")}
              type="button"
            >
              <span className="categoryToolboxIcon">🗂️</span>
              <span className="categoryToolboxLabel">Sem categoria</span>
              <small className="subtle">Produtos sem classificação</small>
              <strong>{categoryCounters.uncategorized}</strong>
            </button>
          </div>
        </article>

        <div className="productSideColumn">
          <article className="panel productAlertPanel">
            <h3>Avisos de estoque baixo</h3>
            {lowStockAlerts.length === 0 ? (
              <p className="subtle">Nenhum alerta de estoque no momento.</p>
            ) : (
              <ul className="productAlertList">
                {lowStockAlerts.map((product) => (
                  <li className="productAlertItem" key={product.id}>
                    <strong>{product.name}</strong>
                    <small className="subtle">{product.sku}</small>
                    <small style={{ color: "#8e2a2a" }}>
                      Estoque {product.currentStock}/{product.minStock}
                    </small>
                    <button
                      className="btnSecondary"
                      onClick={() => onEditProduct(product)}
                      type="button"
                    >
                      Ajustar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="panel productMainPanel">
            <h3>Produtos · {activeCategoryLabel}</h3>
            <div className="productCardsGrid productCardsGridScrollable">
              {filteredProducts.map((product) => {
                const isLowStock = product.currentStock < product.minStock;
                const isDeleted = Boolean(product.archivedAt);

                return (
                  <article
                    className={`productCard ${isLowStock ? "productCardLow" : ""} ${
                      isDeleted ? "productCardDeleted" : ""
                    }`}
                    key={product.id}
                    onClick={() =>
                      setExpandedProductId((prev) => (prev === product.id ? "" : product.id))
                    }
                  >
                    <div className="productCardHead">
                      <div className="productCardTitleWrap">
                        <div className="productCardTitle">
                          <ProductPhotoCarousel images={product.images ?? []} name={product.name} />
                          <div className="productCardTitleMeta">
                            <strong>{product.name}</strong>
                            <div className="productCardTags">
                              {isLowStock ? <span className="productTag productTagLow">Estoque baixo</span> : null}
                              {isDeleted ? <span className="productTag productTagDeleted">Excluído</span> : null}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="productCardActions">
                        {isDeleted ? (
                          <button
                            aria-label="Restaurar produto"
                            className="agendaQuickActionBtn agendaQuickActionDot productActionRestore tooltipTrigger"
                            data-tooltip="Restaurar"
                            onClick={(event) => {
                              event.stopPropagation();
                              onToggleDeleted(product);
                            }}
                            title="Restaurar"
                            type="button"
                          />
                        ) : (
                          <>
                            <button
                              aria-label="Editar produto"
                              className="agendaQuickActionBtn agendaQuickActionDot productActionEdit tooltipTrigger"
                              data-tooltip="Editar"
                              onClick={(event) => {
                                event.stopPropagation();
                                onEditProduct(product);
                              }}
                              title="Editar"
                              type="button"
                            />
                            <button
                              aria-label="Excluir produto"
                              className="agendaQuickActionBtn agendaQuickActionDot productActionDelete tooltipTrigger"
                              data-tooltip="Excluir"
                              onClick={(event) => {
                                event.stopPropagation();
                                onToggleDeleted(product);
                              }}
                              title="Excluir"
                              type="button"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    <p className="subtle productCardSummary">
                      Estoque {product.currentStock}/{product.minStock} · R${" "}
                      {(product.priceCents / 100).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </p>

                    {expandedProductId === product.id ? (
                      <div className="productCardExpanded" onClick={(event) => event.stopPropagation()}>
                        <ProductPhotoPanel images={product.images ?? []} name={product.name} />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            {filteredProducts.length === 0 ? <p className="subtle">Nenhum produto encontrado.</p> : null}

          </article>
        </div>
      </div>
    </section>
  );
}
