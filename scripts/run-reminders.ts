import { PrismaClient, AppointmentStatus, MessageStatus } from "@prisma/client";
import { sendMessage } from "@/lib/sms";

const prisma = new PrismaClient();

const WINDOW_MINUTES = Number(process.env.REMINDER_WINDOW_MINUTES ?? "15");
const HALF_WINDOW_MS = Math.floor((WINDOW_MINUTES * 60 * 1000) / 2);

type ReminderKind = "24h" | "2h";

function windowFor(hoursAhead: number, now: Date) {
  const target = now.getTime() + hoursAhead * 60 * 60 * 1000;
  return {
    start: new Date(target - HALF_WINDOW_MS),
    end: new Date(target + HALF_WINDOW_MS)
  };
}

function buildReminderBody(
  kind: ReminderKind,
  petName: string,
  serviceName: string,
  startsAt: Date
) {
  const when = startsAt.toLocaleString("pt-BR");

  if (kind === "24h") {
    return `Lembrete: o agendamento de ${petName} para ${serviceName} acontece em 24h (${when}).`;
  }

  return `Lembrete: o agendamento de ${petName} para ${serviceName} começa em 2h (${when}).`;
}

async function processReminder(kind: ReminderKind, now: Date) {
  const hoursAhead = kind === "24h" ? 24 : 2;
  const sentAtField = kind === "24h" ? "reminder24hSentAt" : "reminder2hSentAt";
  const range = windowFor(hoursAhead, now);

  const appointments = await prisma.appointment.findMany({
    where: {
      startsAt: {
        gte: range.start,
        lte: range.end
      },
      status: {
        in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]
      },
      [sentAtField]: null
    },
    include: {
      pet: {
        include: {
          customer: true
        }
      },
      service: true
    },
    orderBy: {
      startsAt: "asc"
    }
  });

  let success = 0;
  let failed = 0;

  for (const appointment of appointments) {
    const channel = appointment.pet.customer.preferredChannel;
    const body = buildReminderBody(
      kind,
      appointment.pet.name,
      appointment.service.name,
      appointment.startsAt
    );

    const result = await sendMessage({
      channel,
      to: appointment.pet.customer.phone,
      body
    });

    await prisma.messageLog.create({
      data: {
        customerId: appointment.pet.customer.id,
        channel,
        toPhone: appointment.pet.customer.phone,
        body,
        provider: result.provider,
        providerRef: result.providerRef,
        status: result.status === "SENT" ? MessageStatus.SENT : MessageStatus.FAILED,
        errorMessage: result.errorMessage
      }
    });

    if (result.status === "SENT") {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          reminderSent: true,
          [sentAtField]: now
        }
      });
      success += 1;
    } else {
      failed += 1;
    }
  }

  return { checked: appointments.length, success, failed, range };
}

async function main() {
  const now = new Date();
  const result24h = await processReminder("24h", now);
  const result2h = await processReminder("2h", now);

  console.log("Reminder run finished", {
    now: now.toISOString(),
    windowMinutes: WINDOW_MINUTES,
    reminders24h: {
      checked: result24h.checked,
      success: result24h.success,
      failed: result24h.failed,
      start: result24h.range.start.toISOString(),
      end: result24h.range.end.toISOString()
    },
    reminders2h: {
      checked: result2h.checked,
      success: result2h.success,
      failed: result2h.failed,
      start: result2h.range.start.toISOString(),
      end: result2h.range.end.toISOString()
    }
  });
}

main()
  .catch((error) => {
    console.error("Reminder run failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
