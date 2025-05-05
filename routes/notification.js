const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || "supersecretkey";
const jwt = require("jsonwebtoken");
const Notification = require("../models/notification");

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

  console.log("user", user);
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
      { assignedTo: email, isRead: false }, // Only unread notifications
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

module.exports = router;
