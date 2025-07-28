const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  assignedTo: { type: String, ref: "User", required: true }, // Employee receiving the notification
  createdBy: { type: String, ref: "User", required: true }, // Organizer sending the notification
  type: { type: String, required: true, enum: ["task", "donation_pool", "general", "donation_received"] }, // Notification type
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task" }, // Related task (optional)
  donationPool: { type: mongoose.Schema.Types.ObjectId, ref: "Donations" }, // Related donation pool (optional)
  message: { type: String, required: true }, // Notification message
  taskStatus: { type: String }, // Task status (optional for non-task notifications)
  boardName: { type: String }, // boardName (optional for non-board notifications)
  boardID: { type: String }, // boardID (optional for non-board notifications)
  isRead: { type: Boolean, default: false }, // Read/Unread status
  isUpdated: { type: Boolean, default: false }, // Read/Unread status
  createdAt: { type: Date, default: Date.now }, // Timestamp
});

module.exports = mongoose.model("Notification", notificationSchema);
