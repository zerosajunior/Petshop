import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetActiveCompanyId = vi.fn();

vi.mock("@/lib/company-context", () => ({
  CompanyContextError: class CompanyContextError extends Error {},
  getActiveCompanyId: mockGetActiveCompanyId
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pet: {
      findFirst: vi.fn()
    },
    service: {
      findFirst: vi.fn()
    },
    appointment: {
      findFirst: vi.fn(),
      create: vi.fn()
    }
  }
}));

vi.mock("@/lib/plan-limits", () => ({
  enforceAppointmentLimit: vi.fn()
}));

vi.mock("@/lib/audit", () => ({
  registerAudit: vi.fn()
}));

describe("POST /api/appointments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 503 quando nao ha empresa ativa", async () => {
    const { POST } = await import("@/app/api/appointments/route");

    mockGetActiveCompanyId.mockRejectedValue(new Error("sem empresa"));

    const request = new Request("http://localhost/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });

    const response = await POST(request as never);

    expect(response.status).toBe(503);
  });

  it("retorna 400 quando horario final e menor que inicial", async () => {
    const { POST } = await import("@/app/api/appointments/route");

    mockGetActiveCompanyId.mockResolvedValue("company-1");

    const request = new Request("http://localhost/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        petId: "pet-1",
        serviceId: "srv-1",
        startsAt: "2026-03-22T10:00:00.000Z",
        endsAt: "2026-03-22T09:00:00.000Z"
      })
    });

    const response = await POST(request as never);

    expect(response.status).toBe(400);
  });
});
