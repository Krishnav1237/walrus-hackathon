import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createReceiptSchema = z.object({
  suiAddress: z.string().min(1),
  walrusBlobId: z.string().min(1),
  sealPolicyId: z.string().min(1),
  nftObjectId: z.string().optional(),
  merchantName: z.string().min(1),
  purchaseDate: z.string().datetime(),
  amount: z.number().positive(),
  currency: z.string().length(3),
  warrantyExpiry: z.string().datetime().optional(),
  category: z.string().min(1),
});

// GET /api/receipts - List user's receipts
router.get("/", async (req, res) => {
  try {
    const { suiAddress } = req.query;

    if (!suiAddress || typeof suiAddress !== "string") {
      return res.status(400).json({ error: "suiAddress is required" });
    }

    const user = await prisma.user.findUnique({
      where: { suiAddress },
      include: {
        receipts: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return res.json({ receipts: [] });
    }

    res.json({ receipts: user.receipts });
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(500).json({ error: "Failed to fetch receipts" });
  }
});

// POST /api/receipts - Create new receipt
router.post("/", async (req, res) => {
  try {
    const data = createReceiptSchema.parse(req.body);

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { suiAddress: data.suiAddress },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { suiAddress: data.suiAddress },
      });
    }

    // Create receipt
    const receipt = await prisma.receipt.create({
      data: {
        userId: user.id,
        walrusBlobId: data.walrusBlobId,
        sealPolicyId: data.sealPolicyId,
        nftObjectId: data.nftObjectId,
        merchantName: data.merchantName,
        purchaseDate: new Date(data.purchaseDate),
        amount: data.amount,
        currency: data.currency,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
        category: data.category,
      },
    });

    // Create reminders if warranty exists
    if (data.warrantyExpiry) {
      const expiryDate = new Date(data.warrantyExpiry);
      const reminderDays = [30, 7, 1];

      for (const days of reminderDays) {
        const remindAt = new Date(expiryDate);
        remindAt.setDate(remindAt.getDate() - days);

        if (remindAt > new Date()) {
          await prisma.reminder.create({
            data: {
              receiptId: receipt.id,
              remindAt,
            },
          });
        }
      }
    }

    res.status(201).json({ receipt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error creating receipt:", error);
    res.status(500).json({ error: "Failed to create receipt" });
  }
});

// GET /api/receipts/:id - Get single receipt
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const receipt = await prisma.receipt.findUnique({
      where: { id },
    });

    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    res.json({ receipt });
  } catch (error) {
    console.error("Error fetching receipt:", error);
    res.status(500).json({ error: "Failed to fetch receipt" });
  }
});

// DELETE /api/receipts/:id - Delete receipt
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.reminder.deleteMany({
      where: { receiptId: id },
    });

    await prisma.receipt.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting receipt:", error);
    res.status(500).json({ error: "Failed to delete receipt" });
  }
});

export { router as receiptsRouter };
