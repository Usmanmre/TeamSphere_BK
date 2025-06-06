const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid"); // For generating unique IDs
const Schema = mongoose.Schema;
const TaskSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  createdBy: {
    type: String,
    required: true,
  },
  assignedTo: {
    type: String,
    required: true,
  },
  boardID: {
    type: String,
  },
  status: {
    type: String,
    default: "ToDo",
  },
  selectedBoard: {
    type: String,
  },
  createdAt: { type: Date, default: Date.now }, // Timestamp

});

module.exports = mongoose.model("Tasks", TaskSchema);
