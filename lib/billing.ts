export const getPaystack = async () => {
  const Paystack = (await import("paystack-api")).default
  return new Paystack(process.env.PAYSTACK_SECRET_KEY!)
}