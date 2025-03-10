const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  assignedTo: { type: String, ref: "User", required: true }, // Employee receiving the notification
  createdBy: { type: String, ref: "User", required: true }, // Organizer sending the notification
  task: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true }, // Related task
  message: { type: String, required: true }, // Notification message
  boardName: { type: String, required: true }, // boardName
  boardID: { type: String, required: true }, // boardID
  isRead: { type: Boolean, default: false }, // Read/Unread status
  createdAt: { type: Date, default: Date.now }, // Timestamp
});

module.exports = mongoose.model("Notification", notificationSchema);
