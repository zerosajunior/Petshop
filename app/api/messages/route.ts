import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/http";
import { sendMessage } from "@/lib/sms";
import { MessageChannel, MessageStatus } from "@prisma/client";
import { z } from "zod";

const messageSchema = z.object({
  channel: z.enum(["SMS", "WHATSAPP"]).optional(),
  customerId: z.string().optional(),
  toPhone: z.string().min(8),
  body: z.string().min(3)
});

export async function GET() {
  const messages = await prisma.messageLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return ok(messages);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);

  if (!parsed.success) {
    return fail("Dados de mensagem inválidos");
  }

  const channel = (parsed.data.channel ?? "SMS") as MessageChannel;

  const result = await sendMessage({
    channel,
    to: parsed.data.toPhone,
    body: parsed.data.body
  });

  const log = await prisma.messageLog.create({
    data: {
      customerId: parsed.data.customerId,
      channel,
      toPhone: parsed.data.toPhone,
      body: parsed.data.body,
      provider: result.provider,
      providerRef: result.providerRef,
      status: result.status === "SENT" ? MessageStatus.SENT : MessageStatus.FAILED,
      errorMessage: result.errorMessage
    }
  });

  if (result.status === "FAILED") {
    return fail(result.errorMessage ?? "Falha ao enviar SMS", 502);
  }

  return ok(log, 201);
}
