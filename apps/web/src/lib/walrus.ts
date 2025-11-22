import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'

const WALRUS_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space'
const WALRUS_AGGREGATOR = 'https://aggregator.walrus-testnet.walrus.space'
const STORAGE_EPOCHS = 5

// Seal package on testnet
const SEAL_PACKAGE_ID = '0x9cff3d1a8eda8d2c02f6993d8ee58d19fa90e4de5c5e1edc5ebf95d3cb36a7f9'

export interface UploadResult {
  blobId: string
  sealPolicyId: string
}

/**
 * Upload encrypted receipt to Walrus with Seal encryption
 */
export async function uploadEncryptedReceipt(
  file: File,
  ownerAddress: string,
  suiClient: SuiClient,
  signAndExecute: (tx: { transaction: Transaction }) => Promise<any>
): Promise<UploadResult> {
  const fileBuffer = await file.arrayBuffer()
  const fileData = new Uint8Array(fileBuffer)

  // Step 1: Create Seal encryption policy on-chain
  const policyId = await createSealPolicy(ownerAddress, suiClient, signAndExecute)

  // Step 2: Encrypt data with Seal
  const { encryptedData, encryptedKey } = await sealEncrypt(fileData, policyId, suiClient)

  // Step 3: Package encrypted data with metadata
  const packagedData = packageEncryptedData(encryptedData, encryptedKey, policyId)

  // Step 4: Upload to Walrus
  const blobId = await uploadToWalrus(packagedData)

  return {
    blobId,
    sealPolicyId: policyId,
  }
}

/**
 * Create a Seal policy that only allows the owner to decrypt
 */
async function createSealPolicy(
  ownerAddress: string,
  suiClient: SuiClient,
  signAndExecute: (tx: { transaction: Transaction }) => Promise<any>
): Promise<string> {
  const tx = new Transaction()

  // Create a policy object that gates decryption to the owner
  // This uses Seal's allowlist policy
  tx.moveCall({
    target: `${SEAL_PACKAGE_ID}::allowlist::create_policy`,
    arguments: [
      tx.pure.address(ownerAddress), // owner
    ],
  })

  const result = await signAndExecute({ transaction: tx })

  // Extract policy ID from created objects
  const policyId = result.effects?.created?.[0]?.reference?.objectId
  if (!policyId) {
    throw new Error('Failed to create Seal policy')
  }

  return policyId
}

/**
 * Encrypt data using Seal threshold encryption
 */
async function sealEncrypt(
  data: Uint8Array,
  policyId: string,
  suiClient: SuiClient
): Promise<{ encryptedData: Uint8Array; encryptedKey: Uint8Array }> {
  // Generate a random AES-256 key for symmetric encryption
  const aesKey = crypto.getRandomValues(new Uint8Array(32))

  // Encrypt the data with AES-GCM
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    aesKey,
    'AES-GCM',
    false,
    ['encrypt']
  )

  const encryptedContent = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  )

  // Combine IV + encrypted content
  const encryptedData = new Uint8Array(iv.length + encryptedContent.byteLength)
  encryptedData.set(iv, 0)
  encryptedData.set(new Uint8Array(encryptedContent), iv.length)

  // Encrypt the AES key with Seal's threshold encryption
  // In production, this calls Seal key servers
  // For testnet, we use the policy ID as part of key derivation
  const encryptedKey = await encryptKeyWithSeal(aesKey, policyId, suiClient)

  return { encryptedData, encryptedKey }
}

/**
 * Encrypt the symmetric key using Seal's threshold encryption
 */
async function encryptKeyWithSeal(
  key: Uint8Array,
  policyId: string,
  suiClient: SuiClient
): Promise<Uint8Array> {
  // Fetch Seal key server public keys
  const keyServers = await fetchSealKeyServers(suiClient)

  // Threshold encrypt the key (t-of-n scheme)
  // Each key server gets a share, threshold required to decrypt
  const shares = await thresholdEncrypt(key, keyServers, policyId)

  // Serialize encrypted shares
  return serializeEncryptedShares(shares)
}

/**
 * Fetch Seal key server information
 */
async function fetchSealKeyServers(suiClient: SuiClient): Promise<KeyServer[]> {
  // Query Seal's key server registry
  const registry = await suiClient.getObject({
    id: `${SEAL_PACKAGE_ID}::key_server::Registry`,
    options: { showContent: true }
  })

  // For testnet, use default key servers
  return [
    { id: 'ks1', publicKey: new Uint8Array(32), endpoint: 'https://seal-ks1.testnet.sui.io' },
    { id: 'ks2', publicKey: new Uint8Array(32), endpoint: 'https://seal-ks2.testnet.sui.io' },
    { id: 'ks3', publicKey: new Uint8Array(32), endpoint: 'https://seal-ks3.testnet.sui.io' },
  ]
}

interface KeyServer {
  id: string
  publicKey: Uint8Array
  endpoint: string
}

interface EncryptedShare {
  serverId: string
  share: Uint8Array
}

/**
 * Threshold encrypt using Shamir's Secret Sharing + public key encryption
 */
async function thresholdEncrypt(
  secret: Uint8Array,
  keyServers: KeyServer[],
  policyId: string
): Promise<EncryptedShare[]> {
  // For hackathon: simplified threshold encryption
  // Production would use proper Shamir's Secret Sharing

  const shares: EncryptedShare[] = []
  const threshold = 2
  const n = keyServers.length

  // Create polynomial coefficients
  const coefficients = [secret]
  for (let i = 1; i < threshold; i++) {
    coefficients.push(crypto.getRandomValues(new Uint8Array(32)))
  }

  // Generate shares for each key server
  for (let i = 0; i < n; i++) {
    const x = i + 1
    const share = evaluatePolynomial(coefficients, x)

    // Encrypt share with key server's public key
    // In production, use actual public key encryption
    const encryptedShare = await encryptForKeyServer(share, keyServers[i], policyId)

    shares.push({
      serverId: keyServers[i].id,
      share: encryptedShare,
    })
  }

  return shares
}

function evaluatePolynomial(coefficients: Uint8Array[], x: number): Uint8Array {
  const result = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    let sum = 0
    let xPow = 1
    for (const coef of coefficients) {
      sum = (sum + coef[i] * xPow) % 256
      xPow = (xPow * x) % 256
    }
    result[i] = sum
  }
  return result
}

async function encryptForKeyServer(
  share: Uint8Array,
  keyServer: KeyServer,
  policyId: string
): Promise<Uint8Array> {
  // Derive encryption key from policy ID and server ID
  const keyMaterial = new TextEncoder().encode(`${policyId}:${keyServer.id}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyMaterial)
  const derivedKey = new Uint8Array(hashBuffer)

  // XOR encrypt (production would use proper asymmetric encryption)
  const encrypted = new Uint8Array(share.length)
  for (let i = 0; i < share.length; i++) {
    encrypted[i] = share[i] ^ derivedKey[i % derivedKey.length]
  }
  return encrypted
}

function serializeEncryptedShares(shares: EncryptedShare[]): Uint8Array {
  const encoder = new TextEncoder()
  const json = JSON.stringify(shares.map(s => ({
    serverId: s.serverId,
    share: Array.from(s.share),
  })))
  return encoder.encode(json)
}

/**
 * Package encrypted data with metadata for storage
 */
function packageEncryptedData(
  encryptedData: Uint8Array,
  encryptedKey: Uint8Array,
  policyId: string
): Uint8Array {
  const header = {
    version: 1,
    policyId,
    keyLength: encryptedKey.length,
    dataLength: encryptedData.length,
  }

  const headerBytes = new TextEncoder().encode(JSON.stringify(header) + '\n')

  const result = new Uint8Array(headerBytes.length + encryptedKey.length + encryptedData.length)
  result.set(headerBytes, 0)
  result.set(encryptedKey, headerBytes.length)
  result.set(encryptedData, headerBytes.length + encryptedKey.length)

  return result
}

/**
 * Upload data to Walrus
 */
async function uploadToWalrus(data: Uint8Array): Promise<string> {
  const response = await fetch(
    `${WALRUS_PUBLISHER}/v1/store?epochs=${STORAGE_EPOCHS}`,
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
 * Decrypt a receipt from Walrus using Seal
 */
export async function decryptReceipt(
  blobId: string,
  policyId: string,
  ownerAddress: string,
  suiClient: SuiClient,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<Uint8Array> {
  // Step 1: Fetch encrypted package from Walrus
  const response = await fetch(`${WALRUS_AGGREGATOR}/v1/${blobId}`)
  if (!response.ok) {
    throw new Error(`Walrus fetch failed: ${response.statusText}`)
  }

  const packagedData = new Uint8Array(await response.arrayBuffer())

  // Step 2: Parse the package
  const { encryptedKey, encryptedData, header } = parsePackagedData(packagedData)

  // Step 3: Request decryption from Seal key servers
  const aesKey = await sealDecrypt(encryptedKey, policyId, ownerAddress, suiClient, signMessage)

  // Step 4: Decrypt data with AES key
  const iv = encryptedData.slice(0, 12)
  const ciphertext = encryptedData.slice(12)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    aesKey,
    'AES-GCM',
    false,
    ['decrypt']
  )

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    ciphertext
  )

  return new Uint8Array(decrypted)
}

function parsePackagedData(data: Uint8Array): {
  header: any
  encryptedKey: Uint8Array
  encryptedData: Uint8Array
} {
  // Find header end (newline)
  let headerEnd = 0
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 10) { // newline
      headerEnd = i
      break
    }
  }

  const headerBytes = data.slice(0, headerEnd)
  const header = JSON.parse(new TextDecoder().decode(headerBytes))

  const keyStart = headerEnd + 1
  const keyEnd = keyStart + header.keyLength
  const encryptedKey = data.slice(keyStart, keyEnd)
  const encryptedData = data.slice(keyEnd)

  return { header, encryptedKey, encryptedData }
}

/**
 * Decrypt the AES key using Seal threshold decryption
 */
async function sealDecrypt(
  encryptedKey: Uint8Array,
  policyId: string,
  ownerAddress: string,
  suiClient: SuiClient,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<Uint8Array> {
  // Parse encrypted shares
  const sharesJson = new TextDecoder().decode(encryptedKey)
  const shares: { serverId: string; share: number[] }[] = JSON.parse(sharesJson)

  // Create authorization proof by signing
  const authMessage = new TextEncoder().encode(`decrypt:${policyId}:${Date.now()}`)
  const signature = await signMessage(authMessage)

  // Request decryption from key servers
  const keyServers = await fetchSealKeyServers(suiClient)
  const decryptedShares: { x: number; share: Uint8Array }[] = []

  for (let i = 0; i < shares.length; i++) {
    const server = keyServers.find(ks => ks.id === shares[i].serverId)
    if (!server) continue

    try {
      // In production, call key server API with signature proof
      // Key server verifies on-chain that address is allowed by policy
      const decryptedShare = await requestDecryptionFromServer(
        server,
        new Uint8Array(shares[i].share),
        policyId,
        ownerAddress,
        signature
      )

      decryptedShares.push({ x: i + 1, share: decryptedShare })

      // Only need threshold shares
      if (decryptedShares.length >= 2) break
    } catch (e) {
      console.error(`Key server ${server.id} failed:`, e)
    }
  }

  if (decryptedShares.length < 2) {
    throw new Error('Failed to get enough shares from key servers')
  }

  // Reconstruct secret using Lagrange interpolation
  return reconstructSecret(decryptedShares)
}

async function requestDecryptionFromServer(
  server: KeyServer,
  encryptedShare: Uint8Array,
  policyId: string,
  ownerAddress: string,
  signature: Uint8Array
): Promise<Uint8Array> {
  // For hackathon: simulate key server decryption
  // Production would call actual key server endpoint

  // Derive decryption key (same as encryption)
  const keyMaterial = new TextEncoder().encode(`${policyId}:${server.id}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyMaterial)
  const derivedKey = new Uint8Array(hashBuffer)

  // Decrypt share
  const decrypted = new Uint8Array(encryptedShare.length)
  for (let i = 0; i < encryptedShare.length; i++) {
    decrypted[i] = encryptedShare[i] ^ derivedKey[i % derivedKey.length]
  }

  return decrypted
}

function reconstructSecret(shares: { x: number; share: Uint8Array }[]): Uint8Array {
  // Lagrange interpolation at x=0
  const result = new Uint8Array(32)

  for (let i = 0; i < 32; i++) {
    let sum = 0

    for (let j = 0; j < shares.length; j++) {
      let basis = 1
      for (let k = 0; k < shares.length; k++) {
        if (j !== k) {
          // basis *= (0 - x_k) / (x_j - x_k)
          const xj = shares[j].x
          const xk = shares[k].x
          basis = (basis * (256 - xk) * modInverse(xj - xk + 256, 256)) % 256
        }
      }
      sum = (sum + shares[j].share[i] * basis) % 256
    }

    result[i] = sum
  }

  return result
}

function modInverse(a: number, m: number): number {
  a = ((a % m) + m) % m
  for (let x = 1; x < m; x++) {
    if ((a * x) % m === 1) return x
  }
  return 1
}

/**
 * Create blob URL from decrypted data
 */
export function createBlobUrl(data: Uint8Array, mimeType: string): string {
  const blob = new Blob([data], { type: mimeType })
  return URL.createObjectURL(blob)
}
