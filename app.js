import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import boardRoutes from "./routes/board.js";
import tasksRoutes from "./routes/task.js";
import notificationsRoutes from "./routes/notification.js";
import zoomRoutes from "./routes/zoom.js";
import jobRoutes from "./routes/jobs.js";
import donationRoutes from "./routes/donation.js";
import openAiRoutes from "./routes/openai.js";
import cookieParser from "cookie-parser";

import { Server } from "socket.io";
import http from "http";
import handleSocket from "./sockets/socketHandler.js";
import { initSocket } from "./sockets/socketManager.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3003; // Use environment port for Koyeb
const MONGO_URI = process.env.MONGO_URI; // Load from .env
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3001" || "http://localhost:3000"; // Set frontend URL
// const FRONTEND_URL = "http://localhost:3001" || "http://localhost:3001" ; // Set frontend URL
// CORS Middleware
app.use(
  cors({
    origin: [FRONTEND_URL], // Allow Koyeb frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
const server = http.createServer(app);
const io = initSocket(server);
if (!io) {
  console.error("⚠️ Failed to initialize Socket.IO!");
} else {
  console.log("✅ Calling handleSocket...");
  handleSocket(io); // Attach event listeners
}
// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Special handling for Stripe webhooks - must be raw body
app.use('/api/donations/webhook', express.raw({ type: 'application/json' }));

console.log("Connecting to MongoDB...");

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: true,
    tlsAllowInvalidCertificates: false,
  })
  .then(() => console.log("✅ MongoDB Connected!"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err.message));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/board", boardRoutes);
app.use("/api/task", tasksRoutes);
app.use("/api/notification", notificationsRoutes);
app.use("/api/zoom", zoomRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/openai", openAiRoutes);


// Basic route
app.get("/", (req, res) => {
  res.send("Welcome to my Express App on Koyeb! 🚀");
});

// Global error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Start server
server.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${port}`);
});

export default { io };
