# VaultGuard - Encrypted Receipt & Warranty Vault

> Never lose a receipt. Never miss a warranty. Prove every purchase.

VaultGuard is a Web3 application that securely stores your receipts and warranties with end-to-end encryption on Walrus, mints NFT proofs on Sui, and sends reminders before warranties expire.

## Features

- **Encrypted Storage**: Receipts encrypted with Seal before storing on Walrus
- **NFT Proof**: Immutable on-chain proof of purchase for disputes
- **Smart Reminders**: Automatic notifications before warranties expire
- **Privacy-First**: Only you can decrypt your receipts

## Tech Stack

- **Frontend**: Vite + React, TypeScript, Tailwind CSS
- **Wallet**: @mysten/dapp-kit
- **Backend** *(Optional)*: Node.js, Express, Prisma
- **Database** *(Optional)*: PostgreSQL
- **Queue** *(Optional)*: BullMQ + Redis
- **Blockchain**: Sui Move
- **Storage**: Walrus + Seal

## Project Structure

```
vault-guard/
├── apps/
│   ├── web/           # Vite + React frontend
│   └── api/           # Express backend (optional)
├── packages/
│   └── contracts/     # Sui Move contracts
├── docker-compose.yml
└── package.json
```

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Sui Wallet (browser extension)
- Docker *(optional, only for backend)*

### Option A: Frontend Only (Recommended for Demo)

The frontend works completely standalone with Sui + Walrus + Seal.

#### 1. Install Dependencies

```bash
pnpm install
```

#### 2. Setup Environment

```bash
cd apps/web
echo "VITE_PACKAGE_ID=0x4eb541917d237dd2c932a4c7d79840c5c943a262ecf009bdbd855c528187ed6b" > .env
```

> **Note**: This uses the pre-deployed contract on Sui Testnet. To deploy your own, see "Deploy Contracts" below.

#### 3. Start Frontend

```bash
pnpm dev
```

Open http://localhost:5173 and connect your Sui wallet (Testnet).

### Option B: Full Stack (Backend + Database)

For multi-device sync, warranty reminders, and analytics.

#### 1. Install Dependencies

```bash
pnpm install
```

#### 2. Start Docker Services

```bash
docker-compose up -d
```

#### 3. Setup Environment

```bash
# Frontend
cd apps/web
echo "VITE_PACKAGE_ID=0x4eb541917d237dd2c932a4c7d79840c5c943a262ecf009bdbd855c528187ed6b" > .env

# Backend
cd ../api
cp .env.example .env
# Edit .env and set ENABLE_WORKER=true for reminders
```

#### 4. Initialize Database

```bash
pnpm db:generate
pnpm db:migrate
```

#### 5. Start Everything

```bash
# From root directory
pnpm dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Deploy Your Own Contracts (Optional)

```bash
cd packages/contracts
sui move build
sui client publish --gas-budget 100000000
```

Update `VITE_PACKAGE_ID` in `apps/web/.env` with your deployed package ID.

## Usage

1. **Connect Wallet**: Connect your Sui wallet on the landing page
2. **Upload Receipt**: Take a photo or upload a receipt/warranty document
3. **Add Details**: Enter merchant, date, amount, and warranty expiry
4. **Encrypt & Store**: File is encrypted and stored on Walrus
5. **Mint NFT**: Receipt NFT is minted on Sui as proof
6. **Get Reminders**: Receive notifications before warranties expire
7. **Generate Proof**: Create shareable proof links for claims

## Smart Contracts

### ReceiptNFT

- `mint_receipt`: Create a new receipt NFT with encrypted blob reference
- `generate_proof`: Create a shareable, time-limited proof for verification

### Key Fields

- `blob_id`: Walrus blob identifier
- `seal_policy_id`: Seal encryption policy
- `metadata_hash`: SHA-256 hash of receipt details
- `warranty_expiry`: Unix timestamp for warranty end

## API Endpoints

### Receipts
- `GET /api/receipts` - List user's receipts
- `POST /api/receipts` - Create new receipt
- `GET /api/receipts/:id` - Get receipt details
- `DELETE /api/receipts/:id` - Delete receipt

### Reminders
- `GET /api/reminders` - Get upcoming reminders
- `POST /api/reminders/snooze/:id` - Snooze a reminder
- `POST /api/reminders/settings` - Update notification preferences

### Claims
- `POST /api/claims/generate` - Generate proof for a receipt
- `GET /api/claims/verify/:hash` - Verify a proof

## Encryption Flow

1. User uploads file
2. File encrypted with Seal (threshold encryption)
3. Encrypted blob uploaded to Walrus
4. Blob ID and policy ID stored in NFT
5. Only owner can decrypt using wallet signature

## License

MIT

## Hackathon

Built for the Walrus Web3 Hackathon 2024.

**Why VaultGuard?**
- Direct consumer pain point (lost receipts, missed warranties)
- Privacy advantage over Google Drive
- NFT proof useful for disputes
- Demonstrates Sui + Walrus + Seal integration
