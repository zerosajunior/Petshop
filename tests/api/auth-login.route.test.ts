import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUserFindFirst = vi.fn();
const mockVerifyPassword = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: mockUserFindFirst
    }
  }
}));

vi.mock("@/lib/password", () => ({
  verifyPassword: mockVerifyPassword
}));

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 400 para payload invalido", async () => {
    const { POST } = await import("@/app/api/auth/login/route");

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toMatch(/Credenciais/i);
  });

  it("retorna 401 para usuario/senha invalidos", async () => {
    const { POST } = await import("@/app/api/auth/login/route");

    mockUserFindFirst.mockResolvedValue(null);
    mockVerifyPassword.mockReturnValue(false);

    const request = new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "x@x.com", password: "123" })
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toMatch(/senha|usuario|usuário/i);
  });
});
