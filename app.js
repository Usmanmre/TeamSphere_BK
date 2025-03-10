const express = require("express");
const mongoose = require("mongoose");
const { MONGO_URI } = require("./config");
const bodyParser = require("body-parser");
const cors = require("cors"); // Import cors package
require("dotenv").config();
const authRoutes = require("./routes/auth");
const boardRoutes = require("./routes/board");
const tasksRoutes = require("./routes/task");
const notificationsRoutes = require("./routes/notification");
const { Server } = require("socket.io");
const http = require("http"); // Import HTTP module
const handleSocket = require("./sockets/socketHandler");
const { initSocket } = require("./sockets/socketManager");

const app = express();
const port = 3001; // Port can be customized as needed
const SECRET_KEY = process.env.SECRET_KEY;

// CORS Middleware Configuration
app.use(
  cors({
    origin:[ "http://localhost:3000" , "http://192.168.110.15:3000"], // Allow requests from this origin
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
    credentials: true, // Allow cookies to be sent with requests if needed
  })
);

// Create HTTP server
const server = http.createServer(app); // FIXED: Added missing server instance

const io = initSocket(server); // Initialize socket and save globally

handleSocket(io); // Initializes all socket logic

const onlineUsers = new Map(); // key = userId, value = socketId

// Middleware to parse JSON and URL-encoded bodies
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the "public" directory
app.use(express.static("public"));

console.log("MONGO_URI", MONGO_URI);

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, {
    ssl: true, // Ensure SSL/TLS is used
    tlsAllowInvalidCertificates: false, // Prevent invalid cert issues
  })
  .then(() => console.log("MongoDB connected!"))
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err.message);
  });

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/board", boardRoutes);
app.use("/api/task", tasksRoutes);
app.use("/api/notification", notificationsRoutes);


// Basic route
app.get("/", (req, res) => {
  res.send("Welcome to my Express App!");
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// FIXED: Use `server.listen` instead of `app.listen`
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

module.exports = { io };
