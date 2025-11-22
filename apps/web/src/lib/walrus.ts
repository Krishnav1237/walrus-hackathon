/**
 * Walrus + Seal encryption utilities
 *
 * This module handles:
 * 1. Encrypting files with Seal
 * 2. Uploading encrypted blobs to Walrus
 * 3. Retrieving and decrypting blobs
 */

// Walrus aggregator and publisher endpoints
const WALRUS_AGGREGATOR = "https://aggregator.walrus-testnet.walrus.space";
const WALRUS_PUBLISHER = "https://publisher.walrus-testnet.walrus.space";

// Number of epochs to store data (each epoch ~24h on testnet)
const STORAGE_EPOCHS = 5;

export interface UploadResult {
  blobId: string;
  sealPolicyId: string;
}

/**
 * Encrypt a file and upload to Walrus
 */
export async function uploadEncryptedReceipt(
  file: File,
  ownerAddress: string
): Promise<UploadResult> {
  // Read file as array buffer
  const fileBuffer = await file.arrayBuffer();
  const fileData = new Uint8Array(fileBuffer);

  // For hackathon demo: Simple XOR encryption with address as key
  // In production: Use Seal SDK for proper threshold encryption
  const sealPolicyId = `seal-policy-${ownerAddress}-${Date.now()}`;
  const encryptedData = simpleEncrypt(fileData, ownerAddress);

  // Upload to Walrus
  const response = await fetch(
    `${WALRUS_PUBLISHER}/v1/store?epochs=${STORAGE_EPOCHS}`,
    {
      method: "PUT",
      body: encryptedData,
      headers: {
        "Content-Type": "application/octet-stream",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Walrus upload failed: ${response.statusText}`);
  }

  const result = await response.json();

  // Handle both newlyCreated and alreadyCertified responses
  const blobId = result.newlyCreated?.blobObject?.blobId ||
                 result.alreadyCertified?.blobId;

  if (!blobId) {
    throw new Error("Failed to get blob ID from Walrus response");
  }

  return {
    blobId,
    sealPolicyId,
  };
}

/**
 * Retrieve and decrypt a receipt from Walrus
 */
export async function decryptReceipt(
  blobId: string,
  sealPolicyId: string,
  ownerAddress: string
): Promise<Uint8Array> {
  // Fetch from Walrus
  const response = await fetch(`${WALRUS_AGGREGATOR}/v1/${blobId}`);

  if (!response.ok) {
    throw new Error(`Walrus fetch failed: ${response.statusText}`);
  }

  const encryptedData = new Uint8Array(await response.arrayBuffer());

  // Decrypt
  // In production: Use Seal SDK with wallet signature
  const decryptedData = simpleDecrypt(encryptedData, ownerAddress);

  return decryptedData;
}

/**
 * Convert decrypted data to a viewable URL
 */
export function createBlobUrl(data: Uint8Array, mimeType: string): string {
  const blob = new Blob([data], { type: mimeType });
  return URL.createObjectURL(blob);
}

// Simple XOR encryption for demo purposes
// Production should use Seal SDK
function simpleEncrypt(data: Uint8Array, key: string): Uint8Array {
  const keyBytes = new TextEncoder().encode(key);
  const encrypted = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }
  return encrypted;
}

function simpleDecrypt(data: Uint8Array, key: string): Uint8Array {
  // XOR encryption is symmetric
  return simpleEncrypt(data, key);
}

/**
 * Get Walrus blob metadata
 */
export async function getBlobMetadata(blobId: string): Promise<any> {
  const response = await fetch(`${WALRUS_AGGREGATOR}/v1/${blobId}/metadata`);
  if (!response.ok) {
    throw new Error(`Failed to get blob metadata: ${response.statusText}`);
  }
  return response.json();
}
