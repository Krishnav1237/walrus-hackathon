import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { addDays } from "date-fns";

const router = Router();
const prisma = new PrismaClient();

// GET /api/reminders - Get upcoming reminders
router.get("/", async (req, res) => {
  try {
    const { suiAddress } = req.query;

    if (!suiAddress || typeof suiAddress !== "string") {
      return res.status(400).json({ error: "suiAddress is required" });
    }

    const user = await prisma.user.findUnique({
      where: { suiAddress },
    });

    if (!user) {
      return res.json({ reminders: [] });
    }

    const reminders = await prisma.reminder.findMany({
      where: {
        receipt: {
          userId: user.id,
        },
        reminded: false,
        remindAt: {
          lte: addDays(new Date(), 30),
        },
      },
      include: {
        receipt: true,
      },
      orderBy: {
        remindAt: "asc",
      },
    });

    res.json({ reminders });
  } catch (error) {
    console.error("Error fetching reminders:", error);
    res.status(500).json({ error: "Failed to fetch reminders" });
  }
});

// POST /api/reminders/snooze/:id - Snooze a reminder
router.post("/snooze/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 7 } = req.body;

    const reminder = await prisma.reminder.update({
      where: { id },
      data: {
        snoozedUntil: addDays(new Date(), days),
      },
    });

    res.json({ reminder });
  } catch (error) {
    console.error("Error snoozing reminder:", error);
    res.status(500).json({ error: "Failed to snooze reminder" });
  }
});

// POST /api/reminders/settings - Update notification settings
router.post("/settings", async (req, res) => {
  try {
    const { suiAddress, email, preferences } = req.body;

    const user = await prisma.user.update({
      where: { suiAddress },
      data: {
        email,
        notificationPreferences: preferences,
      },
    });

    res.json({ user });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

export { router as remindersRouter };
