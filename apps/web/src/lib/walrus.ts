const WALRUS_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space'
const WALRUS_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space'
const STORAGE_EPOCHS = 5

export interface UploadResult {
  blobId: string
  sealPolicyId: string
}

export async function uploadEncryptedReceipt(
  file: File,
  ownerAddress: string
): Promise<UploadResult> {
  const fileBuffer = await file.arrayBuffer()
  const fileData = new Uint8Array(fileBuffer)

  // Simple encryption for demo (production would use Seal SDK)
  const sealPolicyId = `seal-policy-${ownerAddress}-${Date.now()}`
  const encryptedData = simpleEncrypt(fileData, ownerAddress)

  const response = await fetch(
    `${WALRUS_PUBLISHER}/v1/store?epochs=${STORAGE_EPOCHS}`,
    {
      method: 'PUT',
      body: encryptedData,
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

  return { blobId, sealPolicyId }
}

export async function decryptReceipt(
  blobId: string,
  _sealPolicyId: string,
  ownerAddress: string
): Promise<Uint8Array> {
  const response = await fetch(`${WALRUS_AGGREGATOR}/v1/${blobId}`)
  if (!response.ok) {
    throw new Error(`Walrus fetch failed: ${response.statusText}`)
  }

  const encryptedData = new Uint8Array(await response.arrayBuffer())
  return simpleDecrypt(encryptedData, ownerAddress)
}

function simpleEncrypt(data: Uint8Array, key: string): Uint8Array {
  const keyBytes = new TextEncoder().encode(key)
  const encrypted = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ keyBytes[i % keyBytes.length]
  }
  return encrypted
}

function simpleDecrypt(data: Uint8Array, key: string): Uint8Array {
  return simpleEncrypt(data, key)
}
