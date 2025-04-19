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

router.post("/create-task", authenticateToken, async (req, res) => {
  console.log("📥 Task Creation Request Received:", req.body);

  const { title, description, assignedTo, selectedBoard, status } = req.body;
  const createdBy = req.user?.email;

  try {
    // ✅ Basic Input Validation
    if (!title || !assignedTo || !selectedBoard?.boardID) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // ✅ Ensure User is Part of the Board BEFORE Task Creation
    const userCheck = await ensureUserInBoard(assignedTo, selectedBoard);

    if (!userCheck.success) {
      return res.status(userCheck.status).json({ message: userCheck.message });
    }

    // ✅ Create Task in Database
    const task = new Tasks({
      title,
      description,
      assignedTo,
      status: status || "inProgress", // Default status if not provided
      createdBy,
      boardID: selectedBoard._id,
      selectedBoard: selectedBoard.title,
    });

    await task.save();
    console.log("✅ Task Successfully Created:", task);

    // ✅ Create and Save Notification
    const notificationMessage = `${title}`;
    const notification = new Notification({
      assignedTo,
      createdBy,
      task: task._id,
      taskStatus: status,
      message: notificationMessage,
      boardName: selectedBoard.title,
      boardID: selectedBoard._id,
    });

    await notification.save();

    const io = getIO();
    const socketId = onlineUsers.get(assignedTo);
    if (socketId && io.sockets.sockets.get(socketId)) {
      io.to(socketId).emit("notification", {
        message: notificationMessage,
        createdBy,
        boardName: selectedBoard.title,
      });
      console.log(`✅ Notification sent to ${assignedTo}`);
    } else {
      console.log(`❌ User ${assignedTo} is offline or has an invalid socket.`);
    }

    res.status(201).json({
      success: true,
      message: "Task created and notification sent.",
      task,
    });
  } catch (error) {
    console.error("❌ Error Creating Task:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});

async function ensureUserInBoard(email, board) {
  console.log(`📥 Checking if user ${email} is part of board ${board.title}`);

  // Find user by email
  const assignedUser = await User.findOne({ email: email });

  if (!assignedUser) {
    console.warn(`⚠️ User ${email} not found.`);
    return {
      success: false,
      status: 404,
      message: `User ${email} is not registered.`,
    };
  }

  console.log("✅ User found:", assignedUser.email);

  // Ensure assignedUser.boards is an array
  if (!Array.isArray(assignedUser.boards)) {
    assignedUser.boards = assignedUser.boards ? [assignedUser.boards] : [];
  }

  // Check if the user is already part of the board
  const alreadyInBoard = assignedUser.boards.some(
    (userBoard) => userBoard.boardID === board._id
  );

  if (alreadyInBoard) {
    console.log(`✅ User ${email} is already in board ${board.title}`);
    return { success: true, status: 200, message: `User already in board.` };
  }

  // Add user to board
  assignedUser.boards.push({
    boardID: board._id,
    title: board.title,
  });

  await assignedUser.save();
  console.log(`✅ Added user ${email} to board ${board.title}`);

  return {
    success: true,
    status: 201,
    message: `User ${email} successfully added to board ${board.title}.`,
  };
}

// Register Route
router.put("/update", authenticateToken, async (req, res) => {
  console.log("req.body", req.body);

  const { title, description, assignedTo, board, status, taskID } = req.body;
  const createdBy = req.user?.email;
  console.log("req.body", req.body);

  try {
    // Find the task by ID
    const existingTask = await Tasks.findOne({ _id: new mongoose.Types.ObjectId(taskID) });


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



router.put("/updateStatus", authenticateToken, async (req, res) => {
  try {
    console.log("📩 Request received:", req.body);

    const { _id, updatedStatus } = req.body;
    const createdBy = req.user?.email;

    if (!_id || !updatedStatus) {
      return res.status(400).json({ message: "Invalid request parameters" });
    }

    // ✅ Find Task by ID
    const existingTask = await Tasks.findById(_id);
    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    console.log("🔍 Found Task:", existingTask.title);

    // ✅ Update Task Status
    existingTask.status = updatedStatus;
    const updatedTask = await existingTask.save();

    // ✅ Find and Update Notification
    const existingNotification = await Notification.findOneAndUpdate(
      { task: existingTask._id },
      {
        taskStatus: updatedStatus,
        message: existingTask.title,
        boardName: existingTask.selectedBoard,
        boardID: existingTask.boardID,
        task: existingTask._id,
        isRead: false,
        isUpdated: true,
      },
      { new: true, upsert: true } // Creates a new notification if not found
    );

    console.log("🔔 Notification Updated:", existingNotification);
   await existingNotification.save()
    // ✅ Emit Real-time Notification if User is Online
    const message = `Task '${existingTask.title}' updated to ${updatedStatus}`;
    const io = getIO();
    const socketId = onlineUsers.get(existingTask.assignedTo);

    if (socketId && io.sockets.sockets.get(socketId)) {
      io.to(socketId).emit("taskUpdated", { message, createdBy, updatedStatus });
      console.log(`✅ Notification sent to ${existingTask.assignedTo}`);
    } else {
      console.log(`❌ User ${existingTask.assignedTo} is offline or has no valid socket.`);
    }

    return res.status(200).json({ message: "Task updated successfully", task: updatedTask });
  } catch (error) {
    console.error("❌ Error occurred:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

module.exports = router;

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
