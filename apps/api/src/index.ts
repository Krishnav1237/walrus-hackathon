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
const NODE_ENV = process.env.NODE_ENV || "development";

// CORS Configuration
const corsOrigins = process.env.CORS_ORIGINS?.split(",") || ["http://localhost:5173"];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check endpoint with detailed status
app.get("/health", async (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    services: {
      api: "healthy",
      database: "unknown",
      redis: "unknown",
    },
  };

  // Check database connection
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = "healthy";
    await prisma.$disconnect();
  } catch (error) {
    health.services.database = "unhealthy";
    health.status = "degraded";
  }

  // Check Redis connection if worker is enabled
  if (process.env.ENABLE_WORKER === "true") {
    try {
      const IORedis = (await import("ioredis")).default;
      const redis = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");
      await redis.ping();
      health.services.redis = "healthy";
      redis.disconnect();
    } catch (error) {
      health.services.redis = "unhealthy";
      health.status = "degraded";
    }
  }

  const statusCode = health.status === "ok" ? 200 : 503;
  res.status(statusCode).json(health);
});

// API version endpoint
app.get("/", (req, res) => {
  res.json({
    name: "VaultGuard API",
    version: "0.1.0",
    status: "running",
    environment: NODE_ENV,
  });
});

// Routes
app.use("/api/receipts", receiptsRouter);
app.use("/api/reminders", remindersRouter);
app.use("/api/claims", claimsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Error:", err);
  
  // Don't leak error details in production
  const message = NODE_ENV === "production" ? "Internal server error" : err.message;
  
  res.status(500).json({ 
    error: message,
    ...(NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Start server
// Export app for Vercel
export default app;

// Start server if not running on Vercel
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`VaultGuard API running on port ${PORT}`);
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    
    server.close(async () => {
      console.log("HTTP server closed");
      
      // Close database connections
      try {
        const { PrismaClient } = await import("@prisma/client");
        const prisma = new PrismaClient();
        await prisma.$disconnect();
        console.log("Database connection closed");
      } catch (error) {
        console.error("Error closing database:", error);
      }
      
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Start background worker for reminders
  if (process.env.ENABLE_WORKER === "true") {
    try {
      startReminderWorker();
      console.log("Reminder worker started");
    } catch (error) {
      console.error("Failed to start reminder worker:", error);
    }
  }
}
