// Walrus testnet endpoints
const WALRUS_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space'
const WALRUS_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space'
const STORAGE_EPOCHS = 1

export interface UploadResult {
  blobId: string
  sealPolicyId: string
}

/**
 * Upload encrypted receipt to Walrus
 * Uses AES-256-GCM encryption with key derived from owner address
 */
export async function uploadEncryptedReceipt(
  file: File,
  ownerAddress: string
): Promise<UploadResult> {
  const fileBuffer = await file.arrayBuffer()
  const fileData = new Uint8Array(fileBuffer)

  // Generate policy ID (hash of address + timestamp)
  const policyId = await generatePolicyId(ownerAddress)

  // Derive encryption key from owner address
  const encryptionKey = await deriveKey(ownerAddress, policyId)

  // Encrypt data with AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encryptionKey,
    'AES-GCM',
    false,
    ['encrypt']
  )

  const encryptedContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    fileData
  )

  // Package: header + iv + encrypted data
  const header = JSON.stringify({
    version: 1,
    policyId,
    algorithm: 'AES-256-GCM',
  })
  const headerBytes = new TextEncoder().encode(header + '\n')

  const packagedData = new Uint8Array(
    headerBytes.length + iv.length + encryptedContent.byteLength
  )
  packagedData.set(headerBytes, 0)
  packagedData.set(iv, headerBytes.length)
  packagedData.set(new Uint8Array(encryptedContent), headerBytes.length + iv.length)

  // Upload to Walrus
  const blobId = await uploadToWalrus(packagedData)

  return {
    blobId,
    sealPolicyId: policyId,
  }
}

/**
 * Generate a policy ID from owner address
 */
async function generatePolicyId(ownerAddress: string): Promise<string> {
  const data = new TextEncoder().encode(`${ownerAddress}:${Date.now()}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Derive encryption key from owner address and policy ID
 */
async function deriveKey(ownerAddress: string, policyId: string): Promise<Uint8Array> {
  const keyMaterial = new TextEncoder().encode(`${ownerAddress}:${policyId}:vault-guard-key`)
  const hash = await crypto.subtle.digest('SHA-256', keyMaterial)
  return new Uint8Array(hash)
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
 * Decrypt a receipt from Walrus
 */
export async function decryptReceipt(
  blobId: string,
  policyId: string,
  ownerAddress: string
): Promise<Uint8Array> {
  // Fetch from Walrus
  const response = await fetch(`${WALRUS_AGGREGATOR}/v1/${blobId}`)
  if (!response.ok) {
    throw new Error(`Walrus fetch failed: ${response.statusText}`)
  }

  const packagedData = new Uint8Array(await response.arrayBuffer())

  // Parse header
  let headerEnd = 0
  for (let i = 0; i < packagedData.length; i++) {
    if (packagedData[i] === 10) { // newline
      headerEnd = i
      break
    }
  }

  const headerBytes = packagedData.slice(0, headerEnd)
  const header = JSON.parse(new TextDecoder().decode(headerBytes))

  // Extract IV and encrypted data
  const iv = packagedData.slice(headerEnd + 1, headerEnd + 1 + 12)
  const encryptedData = packagedData.slice(headerEnd + 1 + 12)

  // Derive decryption key
  const decryptionKey = await deriveKey(ownerAddress, header.policyId)

  // Decrypt
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    decryptionKey,
    'AES-GCM',
    false,
    ['decrypt']
  )

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encryptedData
  )

  return new Uint8Array(decrypted)
}

/**
 * Create blob URL from decrypted data
 */
export function createBlobUrl(data: Uint8Array, mimeType: string): string {
  const blob = new Blob([data], { type: mimeType })
  return URL.createObjectURL(blob)
}
