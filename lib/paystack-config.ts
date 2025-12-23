type PaystackConfig = {
  secretKey: string
  publicKey: string
  webhookSecret: string
  baseUrl: string
}

const requireEnv = (name: string) => {
  const value = process.env[name]
  if (!value) {
    console.warn(`Missing env var: ${name}, using dummy value`)
    return `dummy_${name}`
  }
  return value
}

export const PAYSTACK_CONFIG: PaystackConfig = {
  secretKey: requireEnv("PAYSTACK_SECRET_KEY"),
  publicKey: requireEnv("PAYSTACK_PUBLIC_KEY"),
  webhookSecret: requireEnv("PAYSTACK_WEBHOOK_SECRET"),
  baseUrl: requireEnv("NEXTAUTH_URL")
}
