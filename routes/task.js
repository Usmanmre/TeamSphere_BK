// auth.js
require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Tasks = require("../models/task");
const User = require("../models/user");
const Notification = require("../models/notification");
const sendEmail = require("../utility/Email");
const mongoose = require("mongoose");
const { io } = require("../app"); // or wherever app.js lives
const onlineUsers = require("../sockets/onlineUsers"); // or wherever app.js lives
const { getIO } = require("../sockets/socketManager");

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || "supersecretkey";

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).send("Token required");
  try {
    const user = jwt.verify(token, SECRET_KEY);
    req.user = user;
    next();
  } catch (err) {
    res.status(401).send("Invalid token");
  }
};

router.post("/register", authenticateToken, async (req, res) => {
  console.log("req.body", req.body);

  const { title, description, assignedTo, board, status, selectedBoard } =
    req.body;
  const createdBy = req.user?.email;

  try {
    // ✅ Basic Validation
    if (!title || !assignedTo || !board?.boardID) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // ✅ Ensure User is Part of the Board BEFORE Task Creation
    const userAddedToBoard = await ensureUserInBoard(assignedTo, board);

    if (!userAddedToBoard) {
      return res.status(400).json({
        message: `User ${assignedTo} could not be added to the board.`,
      });
    }

    // ✅ Create Task
    const task = new Tasks({
      title,
      description,
      assignedTo,
      status,
      createdBy,
      boardID: board.boardID,
      selectedBoard,
    });
    await task.save();

    console.log(
      "✅ Current Online Users from task.js:",
      Array.from(onlineUsers.entries())
    );

    // ✅ Prepare Notification
    const message = `${title}`;
    const notification = new Notification({
      assignedTo,
      createdBy,
      task: task._id,
      message,
      boardName: selectedBoard,
      boardID: board.boardID,
    });
    await notification.save();

    // ✅ Check if user is online and send real-time notification
    const socketId = onlineUsers.get(assignedTo);
    console.log(`🔔 Checking online status for user ${assignedTo}:`, socketId);

    if (socketId) {
      const io = getIO();
      io.to(socketId).emit("notification", { message, createdBy, title });
      console.log(`✅ Real-time notification sent to ${assignedTo}`);
    } else {
      console.log(
        `❌ User ${assignedTo} is offline. No real-time notification sent.`
      );
    }

    res.status(201).json({ message: "Task created and notification handled." });
  } catch (error) {
    console.error("❌ Error in /register:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

router.post("/register", authenticateToken, async (req, res) => {
  console.log("req.body", req.body);

  const { title, description, assignedTo, board, status, selectedBoard } =
    req.body;
  const createdBy = req.user?.email;

  try {
    // ✅ Basic Validation
    if (!title || !assignedTo || !board?.boardID) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // ✅ Ensure User is Part of the Board BEFORE Task Creation
    const userAddedToBoard = await ensureUserInBoard(assignedTo, board);

    if (!userAddedToBoard) {
      return res.status(400).json({
        message: `User ${assignedTo} could not be added to the board.`,
      });
    }

    // ✅ Create Task
    const task = new Tasks({
      title,
      description,
      assignedTo,
      status,
      createdBy,
      boardID: board.boardID,
      selectedBoard,
    });
    await task.save();

    console.log(
      "✅ Current Online Users from task.js:",
      Array.from(onlineUsers.entries())
    );

    // ✅ Prepare Notification
    const message = `"${title}"`;
    const notification = new Notification({
      assignedTo,
      createdBy,
      task: task._id,
      message,
    });
    await notification.save();

    // ✅ Check if user is online and send real-time notification
    const socketId = onlineUsers.get(assignedTo);
    console.log(`🔔 Checking online status for user ${assignedTo}:`, socketId);

    if (socketId) {
      const io = getIO();
      io.to(socketId).emit("notification", { message, createdBy, title });
      console.log(`✅ Real-time notification sent to ${assignedTo}`);
    } else {
      console.log(
        `❌ User ${assignedTo} is offline. No real-time notification sent.`
      );
    }

    res.status(201).json({ message: "Task created and notification handled." });
  } catch (error) {
    console.error("❌ Error in /register:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

async function ensureUserInBoard(email, board) {
  console.log(`📥 Checking if user ${email} is part of board ${board.title}`);

  const assignedUser = await User.findOne({ email: email });
  console.log("assignedUser", assignedUser);
  console.log("assignedUser.boards", assignedUser.boards);

  if (!assignedUser) {
    console.warn(`⚠️ User ${email} not found in database.`);
    return false; // No user found, so cannot be in the board.
  }

  // ✅ Defensive Fix: Ensure boards is always an array (data hygiene)
  if (!Array.isArray(assignedUser.boards)) {
    console.warn(
      `⚠️ Fixing invalid boards format for user ${assignedUser.email}`
    );
    assignedUser.boards = assignedUser.boards ? [assignedUser.boards] : [];
  }

  // ✅ Check if already part of the board
  const alreadyInBoard = assignedUser.boards.some(
    (userBoard) => userBoard.boardID === board.boardID
  );
  console.log("alreadyInBoard", alreadyInBoard);

  if (alreadyInBoard) {
    console.log(`✅ User ${email} is already part of board ${board.title}`);
    return true;
  }
  // ✅ Add to board if missing
  assignedUser.boards.push({
    boardID: board.boardID,
    title: board.title,
  });
  console.log("assignedUser now", assignedUser);

  await assignedUser.save();
  console.log(`✅ Added user ${email} to board ${board.title}`);

  return true;
}

// Example Express route (can adapt to Nest easily)
router.post("/test-notification", (req, res) => {
  const { userId, message } = req.body;

  console.log("socketId", socketId);
  console.log("socketId", userId);
});

// Register Route
router.put("/update", authenticateToken, async (req, res) => {
  console.log("req.body", req.body);

  const { title, description, assignedTo, board, status, taskID } = req.body;
  const createdBy = req.user?.email;
  console.log("req.body", req.body);

  try {
    // Find the task by ID
    const existingTask = await Tasks.findOne({ taskID });

    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }
    console.log("existingTask", existingTask);
    // Update task fields if provided in request body
    existingTask.title = title || existingTask.title;
    existingTask.description = description || existingTask.description;
    existingTask.assignedTo = assignedTo || existingTask.assignedTo;
    existingTask.boardID = board || existingTask.boardID;
    existingTask.status = status || existingTask.status;

    // Save updated task
    const updatedTask = await existingTask.save();
    console.log("updatedTask im", updatedTask);

    return res
      .status(200)
      .json({ message: "Task updated successfully", task: updatedTask });
  } catch (error) {
    console.error("Error occurred:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

// Register Route
router.put("/updateStatus", authenticateToken, async (req, res) => {
  console.log("req.body", req.body);

  const { _id, updatedStatus } = req.body;
  const createdBy = req.user?.email;
  console.log("req.body", req.body);
  console.log("id", _id);
  try {
    // Find the task by ID
    const existingTask = await Tasks.findOne({
      _id: new mongoose.Types.ObjectId(_id),
    });

    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }
    console.log("existingTask", existingTask);
    // Update task fields if provided in request body
    existingTask.title = existingTask.title;
    existingTask.description = existingTask.description;
    existingTask.assignedTo = existingTask.assignedTo;
    existingTask.boardID = existingTask.boardID;
    existingTask.status = updatedStatus;

    // Save updated task
    const updatedTask = await existingTask.save();
    const socketId = onlineUsers.get(existingTask.assignedTo); // Note: assignedTo must match the userId from joinRoom
    console.log("socketId", socketId);
    console.log(
      `🔔 Checking online status for user inside updatedTask ${existingTask.assignedTo}:`,
      socketId
    );
    const message = `Task with title '${existingTask.title}' is updated`;
    if (socketId) {
      const io = getIO();
      io.to(socketId).emit("taskUpdated", {
        message,
        createdBy,
      });
    }
    console.log("updatedTask", updatedTask);

    return res
      .status(200)
      .json({ message: "Task updated successfully", task: updatedTask });
  } catch (error) {
    console.error("Error occurred:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

// Register Route
router.get("/all", authenticateToken, async (req, res) => {
  const boardID = req?.query?.boardID;
  try {
    const allTasks = await Tasks.find({ boardID });
    if (!allTasks) {
      return res.status(404).json({ message: "No Tasks found for this email" });
    }
    res.status(200).json(allTasks);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
