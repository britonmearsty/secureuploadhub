import Paystack from "paystack-api"

export const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY!)

export const PAYSTACK_CONFIG = {
  secretKey: process.env.PAYSTACK_SECRET_KEY!,
  publicKey: process.env.PAYSTACK_PUBLIC_KEY!,
  webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET!,
  baseUrl: process.env.NEXTAUTH_URL!
}