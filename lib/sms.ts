export type MessageChannel = "SMS" | "WHATSAPP";

export type MessagePayload = {
  to: string;
  body: string;
  channel: MessageChannel;
};

export type MessageResult = {
  providerRef?: string;
  provider: string;
  status: "SENT" | "FAILED";
  errorMessage?: string;
};

function providerForChannel(channel: MessageChannel) {
  if (channel === "WHATSAPP") {
    return process.env.WHATSAPP_PROVIDER ?? "mock";
  }

  return process.env.SMS_PROVIDER ?? "mock";
}

export async function sendMessage(payload: MessagePayload): Promise<MessageResult> {
  const provider = providerForChannel(payload.channel);
  const tag = payload.channel === "WHATSAPP" ? "WHATSAPP" : "SMS";

  // Initial adapter: logs payload and returns success.
  if (provider === "mock") {
    console.log(`[${tag}:mock]`, payload);
    return {
      provider,
      status: "SENT",
      providerRef: `mock-${Date.now()}`
    };
  }

  return {
    provider,
    status: "FAILED",
    errorMessage: "Provider not implemented yet"
  };
}
