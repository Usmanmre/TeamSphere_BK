const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BoardSchema = new Schema(
  {
    boardID: { type: String, required: true },
    title: { type: String, required: true },
  },
  { _id: false }
); // No need for subdocument _id unless you want it.

const TeamSchema = new Schema(
  {
    email: { type: String, required: true },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["admin", "manager", "employee", "hr"], // Example roles - adjust as needed
    },
    boards: [BoardSchema],
    team: [TeamSchema],
  },
  { timestamps: true }
); // Auto `createdAt` and `updatedAt`

module.exports = mongoose.model("Users", UserSchema);
