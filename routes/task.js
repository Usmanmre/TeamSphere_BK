// auth.js
import dotenv from "dotenv";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Tasks from "../models/task.js";
import User from "../models/user.js";
import Notification from "../models/notification.js";
import { createNotification, sendEmail } from "../utility/Email.js";
import mongoose from "mongoose";
import onlineUsers from "../sockets/onlineUsers.js";
import { getIO } from "../sockets/socketManager.js";
import { normalizeEmail } from "../utility/helper.js";

dotenv.config();

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || "supersecretkey";
const REFRESH_SECRET_KEY =
  process.env.REFRESH_SECRET_KEY || "superrefreshsecretkey";
// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.trim();

  if (!token) return res.status(403).json({ message: "Access token required" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (!err) {
      req.user = user;
      return next(); // ✅ Access token is valid
    }
    // ⚠️ If token expired, try refresh token
    if (err.name === "TokenExpiredError") {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token required" });
      }

      try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET_KEY);

        // Optionally: verify the user still exists or is active
        const newAccessToken = jwt.sign(
          { id: payload.id, email: payload.email, role: payload.role },
          SECRET_KEY,
          { expiresIn: "1h" }
        );

        res.setHeader("x-access-token", newAccessToken); // Optionally send new token
        req.user = jwt.decode(newAccessToken); // Attach decoded info
        next();
      } catch (refreshErr) {
        return res.status(403).json({ message: "Invalid refresh token" });
      }
    } else {
      return res.status(401).json({ message: "Invalid access token" });
    }
  });
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
      lastModifiedBy: createdBy,
      lastModifiedAt: Date.now(),
    });

    await task.save();
    console.log("✅ Task Successfully Created:", task);

    // ✅ Create and Save Notification
    const notificationMessage = `New task assigned: ${title}`;

    await createNotification(
      assignedTo,
      createdBy,
      "task_created",
      notificationMessage,
      {
        task: task._id,
        taskStatus: status,
        boardName: selectedBoard.title,
        boardID: selectedBoard._id,
      }
    );

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

// Helper function to send task notifications
async function sendTaskNotification(recipient, modifiedBy, task, updatedStatus, notificationType = "task_updated", customMessage = null) {
  if (!recipient || recipient === modifiedBy) {
    console.log(`ℹ️ No notification sent - recipient is same as modifier or invalid`);
    return;
  }

  // Use custom message if provided, otherwise use default format
  const notificationMessage = customMessage || `Task '${task.title}' status updated to ${updatedStatus} by ${modifiedBy}`;

  // Save notification to database
  await createNotification(
    recipient,
    modifiedBy,
    notificationType,
    notificationMessage,
    {
      task: task._id,
      taskStatus: updatedStatus,
      boardName: task.selectedBoard,
      boardID: task.boardID,
      isUpdated: true,
    }
  );

  // Send real-time socket notification
  const io = getIO();
  const socketId = onlineUsers.get(recipient);
  const message = customMessage || `Task '${task.title}' updated to ${updatedStatus}`;
 const normalizedEmail = normalizeEmail(modifiedBy);
  if (socketId && io.sockets.sockets.get(socketId)) {
    io.to(socketId).emit("taskUpdated", {
      message,
      updatedStatus,
      normalizedEmail,
    });
    console.log(`✅ Socket notification sent to ${recipient}`);
  } else {
    console.log(`❌ User ${recipient} is offline or has no valid socket.`);
  }
}

// Register Route
router.put("/update", authenticateToken, async (req, res) => {
  console.log("req.body", req.body);

  const { title, description, assignedTo, board, status, taskID } = req.body;
  const createdBy = req.user?.email;
  console.log("req.body", createdBy);

  try {
    // Find the task by ID
    const existingTask = await Tasks.findOne({
      _id: new mongoose.Types.ObjectId(taskID),
    });

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
    existingTask.lastModifiedBy = createdBy;
    existingTask.lastModifiedAt = Date.now();

    // Save updated task
    const updatedTask = await existingTask.save();
    console.log("updatedTask im", updatedTask);

    // 🧠 Determine who should be notified and send notification (same logic as updateStatus)
    const recipient =
      createdBy === existingTask.createdBy
        ? existingTask.assignedTo
        : existingTask.createdBy;

    const customMessage = `$ Task ${title} is updated by ${createdBy}`;
    await sendTaskNotification(recipient, createdBy, existingTask, status, "task_updated", customMessage);

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
    const { _id, updatedStatus } = req.body;
    const modifiedBy = req.user?.email;

    if (!_id || !updatedStatus) {
      return res.status(400).json({ message: "Invalid request parameters" });
    }
    // 🔍 Find Task
    const existingTask = await Tasks.findById(_id);
    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }
    // ✏️ Update Task Status
    existingTask.status = updatedStatus;
    existingTask.lastModifiedBy = modifiedBy;
    existingTask.lastModifiedAt = Date.now();
    const updatedTask = await existingTask.save();
    // 🧠 Determine who should be notified and send notification
    const recipient =
      modifiedBy === existingTask.createdBy
        ? existingTask.assignedTo
        : existingTask.createdBy;

    await sendTaskNotification(recipient, modifiedBy, existingTask, updatedStatus);
    return res.status(200).json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("❌ Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
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

export default router;
