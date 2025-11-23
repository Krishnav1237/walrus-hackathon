module vault_guard::receipt_nft {
    use sui::event;
    use std::string::{Self, String};

    // ===== Events =====
    public struct ReceiptMinted has copy, drop {
        receipt_id: address,
        owner: address,
        merchant: String,
        blob_id: String,
    }

    public struct ProofGenerated has copy, drop {
        receipt_id: address,
        verifier: address,
        timestamp: u64,
    }

    // ===== Objects =====

    /// Receipt NFT - Immutable proof of purchase
    public struct ReceiptNFT has key, store {
        id: UID,
        /// Walrus blob ID for encrypted receipt
        blob_id: String,
        /// Seal policy ID for decryption
        seal_policy_id: String,
        /// Hash of receipt metadata for verification
        metadata_hash: vector<u8>,
        /// Merchant name
        merchant: String,
        /// Purchase date (unix timestamp)
        purchase_date: u64,
        /// Amount in smallest currency unit
        amount: u64,
        /// Currency code (USD, EUR, etc)
        currency: String,
        /// Warranty expiry date (unix timestamp, 0 if no warranty)
        warranty_expiry: u64,
        /// Category (electronics, clothing, etc)
        category: String,
        /// Creation timestamp
        created_at: u64,
    }

    /// Capability for the vault owner
    public struct VaultOwnerCap has key {
        id: UID,
        owner: address,
    }

    /// Shared proof object for verification
    public struct ClaimProof has key {
        id: UID,
        receipt_id: address,
        owner: address,
        blob_id: String,
        metadata_hash: vector<u8>,
        merchant: String,
        purchase_date: u64,
        amount: u64,
        currency: String,
        /// Proof expiry timestamp
        expires_at: u64,
        /// Who can view this proof (empty = public)
        allowed_verifiers: vector<address>,
    }

    // ===== Public Functions =====

    /// Initialize vault for a new user
    public fun init_vault(ctx: &mut TxContext) {
        let cap = VaultOwnerCap {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
        };
        transfer::transfer(cap, tx_context::sender(ctx));
    }

    /// Mint a new receipt NFT
    public fun mint_receipt(
        blob_id: vector<u8>,
        seal_policy_id: vector<u8>,
        metadata_hash: vector<u8>,
        merchant: vector<u8>,
        purchase_date: u64,
        amount: u64,
        currency: vector<u8>,
        warranty_expiry: u64,
        category: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let receipt_id = object::new(ctx);
        let receipt_address = object::uid_to_address(&receipt_id);

        let merchant_str = string::utf8(merchant);
        let blob_id_str = string::utf8(blob_id);

        let receipt = ReceiptNFT {
            id: receipt_id,
            blob_id: blob_id_str,
            seal_policy_id: string::utf8(seal_policy_id),
            metadata_hash,
            merchant: merchant_str,
            purchase_date,
            amount,
            currency: string::utf8(currency),
            warranty_expiry,
            category: string::utf8(category),
            created_at: tx_context::epoch_timestamp_ms(ctx),
        };

        event::emit(ReceiptMinted {
            receipt_id: receipt_address,
            owner: sender,
            merchant: merchant_str,
            blob_id: blob_id_str,
        });

        transfer::transfer(receipt, sender);
    }

    /// Generate a shareable claim proof
    public fun generate_proof(
        receipt: &ReceiptNFT,
        expires_at: u64,
        allowed_verifiers: vector<address>,
        ctx: &mut TxContext
    ) {
        let receipt_address = object::uid_to_address(&receipt.id);

        let proof = ClaimProof {
            id: object::new(ctx),
            receipt_id: receipt_address,
            owner: tx_context::sender(ctx),
            blob_id: receipt.blob_id,
            metadata_hash: receipt.metadata_hash,
            merchant: receipt.merchant,
            purchase_date: receipt.purchase_date,
            amount: receipt.amount,
            currency: receipt.currency,
            expires_at,
            allowed_verifiers,
        };

        event::emit(ProofGenerated {
            receipt_id: receipt_address,
            verifier: tx_context::sender(ctx),
            timestamp: tx_context::epoch_timestamp_ms(ctx),
        });

        transfer::share_object(proof);
    }

    /// Verify a claim proof is valid and not expired
    public fun verify_proof(
        proof: &ClaimProof,
        current_time: u64,
        verifier: address,
    ): bool {
        // Check not expired
        if (current_time > proof.expires_at) {
            return false
        };

        // Check verifier is allowed (empty = public)
        if (vector::length(&proof.allowed_verifiers) > 0) {
            let mut allowed = false;
            let mut i = 0;
            while (i < vector::length(&proof.allowed_verifiers)) {
                if (*vector::borrow(&proof.allowed_verifiers, i) == verifier) {
                    allowed = true;
                    break
                };
                i = i + 1;
            };
            if (!allowed) {
                return false
            };
        };

        true
    }

    // ===== View Functions =====

    public fun get_blob_id(receipt: &ReceiptNFT): String {
        receipt.blob_id
    }

    public fun get_merchant(receipt: &ReceiptNFT): String {
        receipt.merchant
    }

    public fun get_warranty_expiry(receipt: &ReceiptNFT): u64 {
        receipt.warranty_expiry
    }

    public fun get_amount(receipt: &ReceiptNFT): u64 {
        receipt.amount
    }

    public fun is_warranty_valid(receipt: &ReceiptNFT, current_time: u64): bool {
        receipt.warranty_expiry > current_time
    }
}
