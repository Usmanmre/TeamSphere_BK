const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const bodyParser = require("body-parser");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const boardRoutes = require("./routes/board");
const tasksRoutes = require("./routes/task");
const notificationsRoutes = require("./routes/notification");
const { Server } = require("socket.io");
const http = require("http");
const handleSocket = require("./sockets/socketHandler");
const { initSocket } = require("./sockets/socketManager");

const app = express();
const port = process.env.PORT || 3001; // Use environment port for Koyeb
const MONGO_URI = process.env.MONGO_URI; // Load from .env
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000"; // Set frontend URL
// const FRONTEND_URL =  "http://localhost:3000"; // Set frontend URL

// CORS Middleware
app.use(
  cors({
    origin: [FRONTEND_URL], // Allow Koyeb frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);
// Create HTTP server
const server = http.createServer(app);
const io = initSocket(server);
if (!io) {
  console.error("⚠️ Failed to initialize Socket.IO!");
} else {
  console.log("✅ Calling handleSocket...");
  handleSocket(io);  // Attach event listeners
}

// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

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

module.exports = { io };
