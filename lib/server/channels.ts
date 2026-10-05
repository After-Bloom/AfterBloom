import "server-only";

// Text messages for mothers who do not open the app every day or have a basic phone. Needs a Twilio account (or any SMS gateway
// you swap in here). With no credentials set, nothing is sent and the app works exactly as before.
// Wording is always neutral: a text can be read on a shared phone, so it never says what it is about.
export const smsConfigured = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);

/** "98765 43210", "09876543210" and "+91 98765 43210" all become +919876543210. Returns null if it does not look like a phone number. */
export function toE164(raw: string | null | undefined): string | null {
  const digits = String(raw ?? "").replace(/[^\d+]/g, "");
  if (/^\+\d{10,14}$/.test(digits)) return digits;
  const d = digits.replace(/\D/g, "").replace(/^0+/, "");
  if (/^[6-9]\d{9}$/.test(d)) return "+91" + d;
  if (/^91[6-9]\d{9}$/.test(d)) return "+" + d;
  return null;
}

export async function sendText(to: string, body: string): Promise<boolean> {
  if (!smsConfigured()) return false;
  const sid = process.env.TWILIO_ACCOUNT_SID!, token = process.env.TWILIO_AUTH_TOKEN!;
  const whatsapp = process.env.TWILIO_CHANNEL === "whatsapp"; // optional: send through WhatsApp instead (needs an approved sender)
  const params = new URLSearchParams({ To: whatsapp ? `whatsapp:${to}` : to, From: whatsapp ? `whatsapp:${process.env.TWILIO_FROM}` : process.env.TWILIO_FROM!, Body: body });
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST", cache: "no-store",
      headers: { Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    return res.ok;
  } catch { return false; }
}
