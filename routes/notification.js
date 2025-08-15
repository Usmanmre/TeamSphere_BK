import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import Notification from "../models/notification.js";

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
    console.log("error token", err);
    res.status(401).send("Invalid token");
  }
};

router.get("/all", authenticateToken, async (req, res) => {
  const user = req["user"];
  const email = user.email;
  const role = user.role;

  try {
    if (role === "manager") {
      const allNotis = await Notification.find({ createdBy: email }).sort({
        createdAt: -1,
      });
      if (!allNotis) {
        return res.status(404).json({ message: "No Notis found for this user" });
      }
      res.status(200).json(allNotis);
    } else {
      const allNotis = await Notification.find({ assignedTo: email }).sort({
        createdAt: -1,
      });
      if (!allNotis) {
        return res.status(404).json({ message: "No Notis found for this user" });
      }
      res.status(200).json(allNotis);
    }

 
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/update", authenticateToken, async (req, res) => {
  const user = req.user; // This comes from the auth middleware
  const email = user.email;

  try {
    const result = await Notification.updateMany(
      { createdBy: email, isRead: false }, 
      { $set: { isRead: true } } // Set all to read
    );

    if (result.modifiedCount === 0) {
      return res
        .status(200)
        .json({ message: "No unread notifications found for this user" });
    }

    const updatedNotis = await Notification.find({ assignedTo: email }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      message: "All notifications marked as read.",
      notifications: updatedNotis,
    });
  } catch (err) {
    console.error("Error updating notifications:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

export default router;
