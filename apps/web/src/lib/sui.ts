/**
 * Sui blockchain utilities
 *
 * Handles minting Receipt NFTs and generating claim proofs
 */

import { Transaction } from "@mysten/sui/transactions";

// Package ID - update after deployment
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || "0x0";

interface MintReceiptParams {
  blobId: string;
  sealPolicyId: string;
  merchant: string;
  purchaseDate: number;
  amount: number;
  currency: string;
  warrantyExpiry: number;
  category: string;
}

/**
 * Create a transaction to mint a Receipt NFT
 */
export async function mintReceiptNFT(params: MintReceiptParams): Promise<Transaction> {
  const tx = new Transaction();

  // Create metadata hash from receipt details
  const metadataString = JSON.stringify({
    merchant: params.merchant,
    purchaseDate: params.purchaseDate,
    amount: params.amount,
    currency: params.currency,
  });
  const metadataHash = await hashString(metadataString);

  tx.moveCall({
    target: `${PACKAGE_ID}::receipt_nft::mint_receipt`,
    arguments: [
      tx.pure.vector("u8", new TextEncoder().encode(params.blobId)),
      tx.pure.vector("u8", new TextEncoder().encode(params.sealPolicyId)),
      tx.pure.vector("u8", metadataHash),
      tx.pure.vector("u8", new TextEncoder().encode(params.merchant)),
      tx.pure.u64(params.purchaseDate),
      tx.pure.u64(params.amount),
      tx.pure.vector("u8", new TextEncoder().encode(params.currency)),
      tx.pure.u64(params.warrantyExpiry),
      tx.pure.vector("u8", new TextEncoder().encode(params.category)),
    ],
  });

  return tx;
}

/**
 * Create a transaction to generate a claim proof
 */
export async function generateClaimProof(
  receiptObjectId: string,
  expiresAt: number,
  allowedVerifiers: string[] = []
): Promise<Transaction> {
  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::receipt_nft::generate_proof`,
    arguments: [
      tx.object(receiptObjectId),
      tx.pure.u64(expiresAt),
      tx.pure.vector("address", allowedVerifiers),
    ],
  });

  return tx;
}

/**
 * Hash a string using SHA-256
 */
async function hashString(str: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hashBuffer);
}

/**
 * Format SUI amount from MIST
 */
export function formatSuiAmount(mist: bigint): string {
  const sui = Number(mist) / 1_000_000_000;
  return sui.toFixed(4);
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerUrl(digest: string, network: string = "testnet"): string {
  return `https://suiscan.xyz/${network}/tx/${digest}`;
}

/**
 * Get explorer URL for an object
 */
export function getObjectExplorerUrl(objectId: string, network: string = "testnet"): string {
  return `https://suiscan.xyz/${network}/object/${objectId}`;
}
