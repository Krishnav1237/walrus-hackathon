import * as seal from '@mysten/seal'
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import { fromHex, toHex } from '@mysten/sui/utils'

const { SealClient, SessionKey } = seal

// Verified key servers for testnet
const KEY_SERVER_OBJECT_IDS = [
  '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
  '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8',
]

// App package ID (your deployed contract with seal_approve)
// This is used as the encryption namespace
const APP_PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || '0x0'

// Walrus endpoints
const WALRUS_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space'
const WALRUS_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space'
const STORAGE_EPOCHS = 1

let sealClient: SealClient | null = null

export function getSealClient(): SealClient {
  if (!sealClient) {
    const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') })
    sealClient = new SealClient({
      suiClient,
      serverConfigs: KEY_SERVER_OBJECT_IDS.map((id) => ({
        objectId: id,
        weight: 1,
      })),
      verifyKeyServers: false,
    })
  }
  return sealClient
}

export function getSuiClient(): SuiClient {
  return new SuiClient({ url: getFullnodeUrl('testnet') })
}

export interface UploadResult {
  blobId: string
  encryptionId: string // The ID used for Seal encryption
}

/**
 * Generate a unique encryption ID
 */
function generateEncryptionId(): Uint8Array {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32))
  return randomBytes
}

/**
 * Encrypt and upload receipt to Walrus using Seal
 */
export async function uploadEncryptedReceipt(
  file: File,
  _ownerAddress: string
): Promise<UploadResult> {
  const client = getSealClient()

  const fileBuffer = await file.arrayBuffer()
  const fileData = new Uint8Array(fileBuffer)

  // Generate unique encryption ID
  const encryptionId = generateEncryptionId()

  // Encrypt using Seal with threshold of 2
  // packageId must be your app's package (where seal_approve is defined)
  // Both packageId and id should be hex strings
  const { encryptedObject: encryptedBytes } = await client.encrypt({
    threshold: 2,
    packageId: APP_PACKAGE_ID,
    id: toHex(encryptionId),
    data: fileData,
  })

  // Upload encrypted data to Walrus
  const blobId = await uploadToWalrus(encryptedBytes)

  return {
    blobId,
    encryptionId: toHex(encryptionId),
  }
}

/**
 * Upload data to Walrus
 */
async function uploadToWalrus(data: Uint8Array): Promise<string> {
  const response = await fetch(
    `${WALRUS_PUBLISHER}/v1/blobs?epochs=${STORAGE_EPOCHS}`,
    {
      method: 'PUT',
      body: data,
      headers: { 'Content-Type': 'application/octet-stream' },
    }
  )

  if (!response.ok) {
    throw new Error(`Walrus upload failed: ${response.statusText}`)
  }

  const result = await response.json()
  const blobId = result.newlyCreated?.blobObject?.blobId || result.alreadyCertified?.blobId

  if (!blobId) {
    throw new Error('Failed to get blob ID from Walrus')
  }

  return blobId
}

/**
 * Fetch encrypted data from Walrus
 */
export async function fetchFromWalrus(blobId: string): Promise<Uint8Array> {
  const response = await fetch(`${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`)
  if (!response.ok) {
    throw new Error(`Walrus fetch failed: ${response.statusText}`)
  }
  return new Uint8Array(await response.arrayBuffer())
}

/**
 * Build transaction bytes for seal_approve
 */
export function buildSealApproveTx(
  encryptionId: string,
  receiptObjectId: string
): Uint8Array {
  const tx = new Transaction()

  tx.moveCall({
    target: `${APP_PACKAGE_ID}::receipt_nft::seal_approve`,
    arguments: [
      tx.pure.vector('u8', fromHex(encryptionId)),
      tx.object(receiptObjectId),
    ],
  })

  // Build transaction bytes (onlyTransactionKind for Seal)
  const suiClient = getSuiClient()
  // Note: We'll need to build this async in the actual usage
  return new Uint8Array() // Placeholder - actual building happens in component
}

/**
 * Create blob URL from decrypted data
 */
export function createBlobUrl(data: Uint8Array, mimeType: string): string {
  const blob = new Blob([data], { type: mimeType })
  return URL.createObjectURL(blob)
}

export { APP_PACKAGE_ID, KEY_SERVER_OBJECT_IDS, SessionKey }
