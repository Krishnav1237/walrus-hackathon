# VaultGuard: Encrypted Receipt & Warranty Vault

## Product Concept

**Tagline**: "Never lose a receipt. Never miss a warranty. Prove every purchase."

### Core Value Proposition
- **Encrypted Storage**: Receipts/warranties stored on Walrus with Seal encryption - only you can access
- **Smart Reminders**: Automatic expiry notifications before warranties end
- **NFT Proof**: Immutable on-chain proof of purchase for disputes/claims
- **Privacy-First**: Unlike Google Drive, data is encrypted end-to-end

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React/Next.js)                │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ Upload  │ │ Vault   │ │Reminders│ │ Claims  │           │
│  │ Module  │ │ Browser │ │ Panel   │ │ Proof   │           │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
└───────┼──────────┼──────────┼──────────┼───────────────────┘
        │          │          │          │
        ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND SERVICES                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ API Gateway  │  │  Reminder    │  │   OCR/AI     │       │
│  │   (REST)     │  │   Service    │  │  Extraction  │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  BLOCKCHAIN LAYER (Sui)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Receipt     │  │   Proof      │  │   Access     │       │
│  │   NFTs       │  │  Registry    │  │   Control    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│              STORAGE LAYER (Walrus + Seal)                   │
│  ┌──────────────────────────────────────────────────┐       │
│  │  Encrypted Blobs (Receipts, Warranties, Images)  │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Frontend (Next.js + TypeScript)

#### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Wallet**: @mysten/dapp-kit
- **State**: Zustand
- **Forms**: React Hook Form + Zod

#### Key Pages/Components

```typescript
// src/app structure
├── page.tsx                 // Landing page
├── dashboard/
│   ├── page.tsx            // Main vault view
│   ├── upload/page.tsx     // Upload new receipt
│   └── [id]/page.tsx       // Receipt detail view
├── reminders/page.tsx      // Upcoming expirations
├── claims/
│   ├── page.tsx            // Generate proof
│   └── verify/page.tsx     // Public verification
└── settings/page.tsx       // Notification preferences
```

#### Core Components

```typescript
// Components
├── ReceiptUploader.tsx     // Drag-drop + camera capture
├── VaultGrid.tsx           // Receipt cards with search/filter
├── ExpiryCalendar.tsx      // Visual warranty timeline
├── ProofGenerator.tsx      // Create shareable proof link
├── EncryptionStatus.tsx    // Show Seal encryption state
└── WalletConnect.tsx       // Sui wallet integration
```

### 2. Backend Services

#### Tech Stack
- **Runtime**: Node.js + Express or Hono
- **Database**: PostgreSQL (metadata only)
- **Queue**: BullMQ + Redis
- **OCR**: Tesseract.js or Google Vision API

#### API Endpoints

```typescript
// Receipt Management
POST   /api/receipts              // Upload & encrypt receipt
GET    /api/receipts              // List user's receipts
GET    /api/receipts/:id          // Get receipt metadata
DELETE /api/receipts/:id          // Delete receipt
PATCH  /api/receipts/:id          // Update metadata

// Reminders
GET    /api/reminders             // Get upcoming expirations
POST   /api/reminders/settings    // Set notification prefs
POST   /api/reminders/snooze/:id  // Snooze a reminder

// Claims & Proof
POST   /api/claims/generate       // Generate proof NFT
GET    /api/claims/verify/:hash   // Public verification endpoint

// OCR Processing
POST   /api/ocr/extract           // Extract data from receipt image
```

#### Database Schema

```sql
-- Users (linked to Sui address)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  sui_address VARCHAR(66) UNIQUE NOT NULL,
  email VARCHAR(255),
  notification_preferences JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Receipt Metadata (actual files on Walrus)
CREATE TABLE receipts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  walrus_blob_id VARCHAR(255) NOT NULL,
  nft_object_id VARCHAR(66),

  -- Extracted/User-provided metadata
  merchant_name VARCHAR(255),
  purchase_date DATE,
  amount DECIMAL(10,2),
  currency VARCHAR(3),
  warranty_expiry DATE,
  category VARCHAR(50),

  -- Encryption
  seal_policy_id VARCHAR(66),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Reminder Queue
CREATE TABLE reminders (
  id UUID PRIMARY KEY,
  receipt_id UUID REFERENCES receipts(id),
  remind_at TIMESTAMP NOT NULL,
  reminded BOOLEAN DEFAULT FALSE,
  snoozed_until TIMESTAMP
);
```

### 3. On-Chain Components (Sui Move)

#### Smart Contracts

```move
// sources/vault_guard.move

module vault_guard::receipt_nft {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::string::String;

    /// Receipt NFT - Proof of purchase
    struct ReceiptNFT has key, store {
        id: UID,
        // Walrus blob reference
        blob_id: String,
        // Receipt metadata hash (for verification)
        metadata_hash: vector<u8>,
        // Merchant info
        merchant: String,
        purchase_date: u64,
        amount: u64,
        // Warranty info
        warranty_expiry: u64,
        // Timestamps
        created_at: u64,
    }

    /// Mint a new receipt NFT
    public entry fun mint_receipt(
        blob_id: String,
        metadata_hash: vector<u8>,
        merchant: String,
        purchase_date: u64,
        amount: u64,
        warranty_expiry: u64,
        ctx: &mut TxContext
    ) {
        let receipt = ReceiptNFT {
            id: object::new(ctx),
            blob_id,
            metadata_hash,
            merchant,
            purchase_date,
            amount,
            warranty_expiry,
            created_at: tx_context::epoch(ctx),
        };
        transfer::transfer(receipt, tx_context::sender(ctx));
    }

    /// Generate a claim proof (returns object for verification)
    public fun get_proof(receipt: &ReceiptNFT): (String, vector<u8>, u64) {
        (receipt.blob_id, receipt.metadata_hash, receipt.purchase_date)
    }
}

module vault_guard::access_control {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::vec_set::{Self, VecSet};

    /// Access control for shared receipts
    struct SharedAccess has key {
        id: UID,
        receipt_id: address,
        owner: address,
        authorized_viewers: VecSet<address>,
        expires_at: u64,
    }

    /// Share receipt access with another address
    public entry fun grant_access(
        receipt_id: address,
        viewer: address,
        expires_at: u64,
        ctx: &mut TxContext
    ) {
        let mut viewers = vec_set::empty();
        vec_set::insert(&mut viewers, viewer);

        let access = SharedAccess {
            id: object::new(ctx),
            receipt_id,
            owner: tx_context::sender(ctx),
            authorized_viewers: viewers,
            expires_at,
        };
        transfer::share_object(access);
    }
}
```

### 4. Storage Layer (Walrus + Seal)

#### Encryption Flow

```typescript
// lib/encryption.ts

import { SealClient } from '@aspect/seal-sdk';
import { WalrusClient } from '@aspect/walrus-sdk';

export async function uploadEncryptedReceipt(
  file: File,
  userAddress: string,
  walletSigner: any
): Promise<{ blobId: string; policyId: string }> {

  // 1. Create Seal encryption policy (only owner can decrypt)
  const sealClient = new SealClient({ network: 'testnet' });
  const policy = await sealClient.createPolicy({
    owner: userAddress,
    allowedAddresses: [userAddress],
  });

  // 2. Encrypt file with Seal
  const fileBuffer = await file.arrayBuffer();
  const encryptedData = await sealClient.encrypt(
    new Uint8Array(fileBuffer),
    policy.id
  );

  // 3. Upload encrypted blob to Walrus
  const walrusClient = new WalrusClient({
    network: 'testnet',
    epochs: 5 // Store for 5 epochs
  });

  const { blobId } = await walrusClient.store(encryptedData);

  return {
    blobId,
    policyId: policy.id
  };
}

export async function decryptReceipt(
  blobId: string,
  policyId: string,
  walletSigner: any
): Promise<Uint8Array> {

  // 1. Fetch encrypted blob from Walrus
  const walrusClient = new WalrusClient({ network: 'testnet' });
  const encryptedData = await walrusClient.retrieve(blobId);

  // 2. Decrypt with Seal (requires wallet signature)
  const sealClient = new SealClient({ network: 'testnet' });
  const decryptedData = await sealClient.decrypt(
    encryptedData,
    policyId,
    walletSigner
  );

  return decryptedData;
}
```

---

## User Flows

### Flow 1: Upload Receipt

```
1. User connects Sui wallet
2. Uploads receipt image/PDF
3. OCR extracts: merchant, date, amount, warranty period
4. User confirms/edits extracted data
5. System encrypts file with Seal
6. Uploads encrypted blob to Walrus
7. Mints Receipt NFT on Sui
8. Creates reminder for warranty expiry
9. Shows success + receipt in vault
```

### Flow 2: View & Decrypt Receipt

```
1. User browses vault (sees encrypted thumbnails)
2. Clicks on receipt
3. Signs decryption request with wallet
4. Seal decrypts blob from Walrus
5. Receipt displayed in full
```

### Flow 3: Warranty Reminder

```
1. Cron job checks expiring warranties (30, 7, 1 day before)
2. Sends notification (email/push/on-chain event)
3. User can snooze or take action
4. Links to receipt for claim details
```

### Flow 4: Generate Claim Proof

```
1. User selects receipt for claim
2. Chooses what to share (full receipt or metadata only)
3. System generates time-limited shareable link
4. Optionally: On-chain proof transaction
5. Merchant/insurer verifies via public endpoint
```

---

## Project Structure

```
vault-guard/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/           # App router pages
│   │   │   ├── components/    # React components
│   │   │   ├── hooks/         # Custom hooks
│   │   │   ├── lib/           # Utilities
│   │   │   └── styles/        # Global styles
│   │   └── package.json
│   │
│   └── api/                    # Backend API
│       ├── src/
│       │   ├── routes/        # API routes
│       │   ├── services/      # Business logic
│       │   ├── jobs/          # Background jobs
│       │   └── db/            # Database models
│       └── package.json
│
├── packages/
│   ├── contracts/              # Sui Move contracts
│   │   ├── sources/
│   │   │   └── vault_guard.move
│   │   └── Move.toml
│   │
│   └── shared/                 # Shared types/utils
│       └── src/
│
├── docker-compose.yml          # Local dev environment
└── README.md
```

---

## Tech Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 14, TypeScript, Tailwind | Web application |
| Wallet | @mysten/dapp-kit | Sui wallet connection |
| Backend | Node.js, Express/Hono | API server |
| Database | PostgreSQL | Metadata storage |
| Queue | BullMQ + Redis | Background jobs |
| Blockchain | Sui Move | NFTs, access control |
| Storage | Walrus | Decentralized blob storage |
| Encryption | Seal | Client-side encryption |
| OCR | Tesseract.js | Receipt data extraction |

---

## MVP Feature Scope

### Phase 1 (Hackathon MVP)
- [ ] Wallet connection (Sui)
- [ ] Upload receipt with Seal encryption
- [ ] Store on Walrus
- [ ] Mint basic Receipt NFT
- [ ] View/decrypt receipts
- [ ] Manual warranty date entry
- [ ] Simple expiry list

### Phase 2 (Post-Hackathon)
- [ ] OCR auto-extraction
- [ ] Email/push reminders
- [ ] Shareable proof links
- [ ] Categories & search
- [ ] Mobile PWA

### Phase 3 (Future)
- [ ] Multi-sig family vaults
- [ ] Insurance integrations
- [ ] Receipt analytics
- [ ] Merchant verification badges

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Start local development
pnpm dev

# Build contracts
cd packages/contracts && sui move build

# Deploy contracts (testnet)
sui client publish --gas-budget 100000000

# Run tests
pnpm test

# Database migrations
pnpm db:migrate
```

---

## Environment Variables

```env
# Frontend
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_API_URL=http://localhost:3001

# Backend
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
WALRUS_NETWORK=testnet

# Sui
SUI_PRIVATE_KEY=...
PACKAGE_ID=0x...
```

---

## Competitive Advantages

1. **vs Google Drive**: End-to-end encryption, you control access
2. **vs Apple Wallet**: Works across all devices, blockchain proof
3. **vs Receipt apps**: Decentralized, can't go out of business
4. **vs Manual tracking**: Automatic reminders, searchable

---

## Hackathon Demo Script

1. **Problem** (30s): Show lost receipt frustration
2. **Solution** (30s): Introduce VaultGuard
3. **Demo** (3min):
   - Connect wallet
   - Upload receipt → show encryption
   - View in vault → decrypt
   - Show warranty reminder
   - Generate proof link
4. **Tech** (1min): Sui + Walrus + Seal architecture
5. **Future** (30s): Roadmap highlights
