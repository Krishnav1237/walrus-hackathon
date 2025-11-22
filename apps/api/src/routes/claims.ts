import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const router = Router();
const prisma = new PrismaClient();

// POST /api/claims/generate - Generate a claim proof
router.post("/generate", async (req, res) => {
  try {
    const { receiptId, expiresInHours = 24 } = req.body;

    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
    });

    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    // Generate proof hash
    const proofData = {
      receiptId: receipt.id,
      merchantName: receipt.merchantName,
      purchaseDate: receipt.purchaseDate,
      amount: receipt.amount,
      currency: receipt.currency,
      timestamp: Date.now(),
    };

    const proofHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(proofData))
      .digest("hex");

    // Store proof (in production, would also create on-chain)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // For now, return the proof details
    // In production, this would create a ClaimProof on-chain
    res.json({
      proof: {
        hash: proofHash,
        receiptId: receipt.id,
        merchantName: receipt.merchantName,
        purchaseDate: receipt.purchaseDate,
        amount: receipt.amount,
        currency: receipt.currency,
        expiresAt,
        verifyUrl: `/api/claims/verify/${proofHash}`,
      },
    });
  } catch (error) {
    console.error("Error generating proof:", error);
    res.status(500).json({ error: "Failed to generate proof" });
  }
});

// GET /api/claims/verify/:hash - Verify a claim proof
router.get("/verify/:hash", async (req, res) => {
  try {
    const { hash } = req.params;

    // In production, this would verify against on-chain data
    // For demo, we'll return a basic verification response

    res.json({
      valid: true,
      hash,
      message: "Proof verification would check on-chain ClaimProof object",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error verifying proof:", error);
    res.status(500).json({ error: "Failed to verify proof" });
  }
});

export { router as claimsRouter };
