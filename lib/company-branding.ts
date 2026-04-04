type BrandingPayload = {
  note?: string | null;
  logoDataUrl?: string | null;
};

export type ParsedBranding = {
  note: string | null;
  logoDataUrl: string | null;
};

function toNullableTrimmed(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const next = value.trim();
  return next.length > 0 ? next : null;
}

export function parseCompanyBranding(raw?: string | null): ParsedBranding {
  const value = toNullableTrimmed(raw);
  if (!value) {
    return { note: null, logoDataUrl: null };
  }

  if (value.startsWith("data:image/")) {
    return { note: null, logoDataUrl: value };
  }

  try {
    const parsed = JSON.parse(value) as BrandingPayload;
    return {
      note: toNullableTrimmed(parsed?.note),
      logoDataUrl: toNullableTrimmed(parsed?.logoDataUrl)
    };
  } catch {
    return { note: value, logoDataUrl: null };
  }
}

export function serializeCompanyBranding(input: BrandingPayload) {
  const note = toNullableTrimmed(input.note);
  const logoDataUrl = toNullableTrimmed(input.logoDataUrl);

  if (!note && !logoDataUrl) {
    return null;
  }

  return JSON.stringify({
    note,
    logoDataUrl
  });
}
