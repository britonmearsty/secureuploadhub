declare module 'paystack-api' {
  interface PaystackConfig {
    secretKey: string
  }

  interface InitializeTransactionData {
    amount: number
    email: string
    reference?: string
    callback_url?: string
    metadata?: Record<string, any>
    channels?: string[]
  }

  interface InitializeTransactionResponse {
    status: boolean
    message: string
    data: {
      authorization_url: string
      access_code: string
      reference: string
    }
  }

  interface VerifyTransactionResponse {
    status: boolean
    message: string
    data: {
      id: number
      reference: string
      amount: number
      currency: string
      status: string
      paid_at: string
      created_at: string
      channel: string
      customer: {
        id: number
        email: string
      }
    }
  }

  class Transaction {
    initialize(data: InitializeTransactionData): Promise<InitializeTransactionResponse>
    verify(reference: string): Promise<VerifyTransactionResponse>
  }

  class Paystack {
    constructor(secretKey: string)
    transaction: Transaction
  }

  export default Paystack
}