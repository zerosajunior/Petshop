import { headers } from "next/headers";

export class CompanyContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompanyContextError";
  }
}

export async function getActiveCompanyId() {
  const requestHeaders = await headers();
  const fromSession = requestHeaders.get("x-company-id")?.trim();
  if (fromSession) {
    return fromSession;
  }

  // Segurança multi-tenant: não fazemos fallback silencioso para empresa padrão
  // em rotas autenticadas. Se o contexto não vier da sessão, bloqueamos a operação.
  throw new CompanyContextError(
    "Contexto da empresa ausente na sessão. Faça login novamente e selecione a empresa ativa."
  );
}
