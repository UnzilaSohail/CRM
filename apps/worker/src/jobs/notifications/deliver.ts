export type Channel = (recipient: string, message: string) => Promise<void>;

export interface DeliveryResult {
  recipient: string;
  status: "delivered" | "failed";
  attempts: number;
  error?: string;
}

/**
 * Deliver to every recipient independently. One recipient's failure never blocks the others,
 * and each failure is retried before being recorded as failed (the caller persists delivery status).
 */
export async function deliverAll(
  recipients: readonly string[],
  message: string,
  send: Channel,
  maxAttempts = 3,
): Promise<DeliveryResult[]> {
  return Promise.all(
    recipients.map(async (recipient): Promise<DeliveryResult> => {
      let lastError = "";
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await send(recipient, message);
          return { recipient, status: "delivered", attempts: attempt };
        } catch (e) {
          lastError = e instanceof Error ? e.message : String(e);
        }
      }
      return { recipient, status: "failed", attempts: maxAttempts, error: lastError };
    }),
  );
}
