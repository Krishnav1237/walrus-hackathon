import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { receiptsRouter } from "./routes/receipts";
import { remindersRouter } from "./routes/reminders";
import { claimsRouter } from "./routes/claims";
import { startReminderWorker } from "./services/reminderWorker";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/receipts", receiptsRouter);
app.use("/api/reminders", remindersRouter);
app.use("/api/claims", claimsRouter);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`VaultGuard API running on port ${PORT}`);
});

// Start background worker for reminders
if (process.env.ENABLE_WORKER === "true") {
  startReminderWorker();
}
