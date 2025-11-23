import { Transaction } from '@mysten/sui/transactions'

const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x0'

interface MintReceiptParams {
  blobId: string
  sealPolicyId: string
  merchant: string
  purchaseDate: number
  amount: number
  currency: string
  warrantyExpiry: number
  category: string
}

export async function mintReceiptNFT(params: MintReceiptParams): Promise<Transaction> {
  const tx = new Transaction()

  const metadataString = JSON.stringify({
    merchant: params.merchant,
    purchaseDate: params.purchaseDate,
    amount: params.amount,
    currency: params.currency,
  })
  const metadataHash = await hashString(metadataString)

  tx.moveCall({
    target: `${PACKAGE_ID}::receipt_nft::mint_receipt`,
    arguments: [
      tx.pure.vector('u8', new TextEncoder().encode(params.blobId)),
      tx.pure.vector('u8', new TextEncoder().encode(params.sealPolicyId)),
      tx.pure.vector('u8', metadataHash),
      tx.pure.vector('u8', new TextEncoder().encode(params.merchant)),
      tx.pure.u64(params.purchaseDate),
      tx.pure.u64(params.amount),
      tx.pure.vector('u8', new TextEncoder().encode(params.currency)),
      tx.pure.u64(params.warrantyExpiry),
      tx.pure.vector('u8', new TextEncoder().encode(params.category)),
    ],
  })

  return tx
}

async function hashString(str: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(hashBuffer)
}
