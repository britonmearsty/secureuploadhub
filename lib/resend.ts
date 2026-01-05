import { Resend } from 'resend';

let resendInstance: Resend | null = null;

export function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('Missing API key. Pass it to the constructor `new Resend("re_123")`');
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

// For backward compatibility
export const resend = {
  get emails() {
    return getResend().emails;
  }
};
