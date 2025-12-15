import { Worker, Queue } from "bullmq";
import { PrismaClient } from "@prisma/client";
import IORedis from "ioredis";

const prisma = new PrismaClient();

// Lazy-initialized Redis connection and queue
let connection: IORedis | null = null;
let reminderQueue: Queue | null = null;

function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

function getQueue(): Queue {
  if (!reminderQueue) {
    reminderQueue = new Queue("reminders", { connection: getConnection() });
  }
  return reminderQueue;
}

/**
 * Start the reminder worker
 */
export function startReminderWorker() {
  console.log("Starting reminder worker...");

  // Process reminder jobs
  const worker = new Worker(
    "reminders",
    async (job) => {
      const { reminderId } = job.data;

      const reminder = await prisma.reminder.findUnique({
        where: { id: reminderId },
        include: {
          receipt: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!reminder || reminder.reminded) {
        return;
      }

      // Check if snoozed
      if (reminder.snoozedUntil && reminder.snoozedUntil > new Date()) {
        return;
      }

      // Send notification
      await sendNotification(reminder);

      // Mark as reminded
      await prisma.reminder.update({
        where: { id: reminderId },
        data: { reminded: true },
      });

      console.log(`Sent reminder for receipt ${reminder.receiptId}`);
    },
    { connection: getConnection() }
  );

  worker.on("completed", (job) => {
    console.log(`Reminder job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`Reminder job ${job?.id} failed:`, err);
  });

  // Schedule check for due reminders every minute
  setInterval(async () => {
    await scheduleDueReminders();
  }, 60 * 1000);

  // Initial check
  scheduleDueReminders();
}

/**
 * Find and schedule due reminders
 */
async function scheduleDueReminders() {
  const dueReminders = await prisma.reminder.findMany({
    where: {
      reminded: false,
      remindAt: {
        lte: new Date(),
      },
      OR: [
        { snoozedUntil: null },
        { snoozedUntil: { lte: new Date() } },
      ],
    },
  });

  for (const reminder of dueReminders) {
    await getQueue().add("send-reminder", {
      reminderId: reminder.id,
    });
  }
}

/**
 * Send notification for a reminder
 */
async function sendNotification(reminder: any) {
  const { receipt, user } = reminder.receipt;
  const daysUntilExpiry = Math.ceil(
    (new Date(receipt.warrantyExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  // Log notification (in production, would send email/push)
  console.log(`
    === WARRANTY REMINDER ===
    User: ${user.suiAddress}
    Email: ${user.email || "Not set"}
    Merchant: ${receipt.merchantName}
    Days until expiry: ${daysUntilExpiry}
    =========================
  `);

  // TODO: Implement actual notification sending
  // - Email via SendGrid/Resend
  // - Push via web-push
  // - On-chain event emission
}

/**
 * Add a reminder to the queue
 */
export async function queueReminder(reminderId: string, remindAt: Date) {
  const delay = remindAt.getTime() - Date.now();
  if (delay > 0) {
    await getQueue().add(
      "send-reminder",
      { reminderId },
      { delay }
    );
  }
}
