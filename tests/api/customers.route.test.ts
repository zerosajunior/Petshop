import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetActiveCompanyId = vi.fn();
const mockCustomerCreate = vi.fn();
const mockRegisterAudit = vi.fn();

vi.mock("@/lib/company-context", () => ({
  CompanyContextError: class CompanyContextError extends Error {},
  getActiveCompanyId: mockGetActiveCompanyId
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      create: mockCustomerCreate
    }
  }
}));

vi.mock("@/lib/audit", () => ({
  registerAudit: mockRegisterAudit
}));

describe("POST /api/customers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 503 quando nao ha empresa ativa", async () => {
    const { POST } = await import("@/app/api/customers/route");

    mockGetActiveCompanyId.mockRejectedValue(new Error("sem empresa"));

    const request = new Request("http://localhost/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Jose", phone: "11999998888", zipCode: "01001000" })
    });

    const response = await POST(request as never);

    expect(response.status).toBe(503);
  });

  it("retorna 201 para cliente valido", async () => {
    const { POST } = await import("@/app/api/customers/route");

    mockGetActiveCompanyId.mockResolvedValue("company-1");
    mockCustomerCreate.mockResolvedValue({
      id: "cus-1",
      companyId: "company-1",
      name: "Jose",
      phone: "11999998888",
      zipCode: "01001000"
    });

    const request = new Request("http://localhost/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Jose", phone: "11999998888", zipCode: "01001000" })
    });

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.id).toBe("cus-1");
    expect(mockRegisterAudit).toHaveBeenCalledTimes(1);
  });
});
