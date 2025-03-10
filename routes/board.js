// auth.js
require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Boards = require("../models/board");
const User = require("../models/user");

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
// Register Route
router.post("/register", authenticateToken, async (req, res) => {
  const { title } = req.body;
  const createdBy = req.user?.email;
  try {
    const newBoard = new Boards({ title, createdBy });
    await newBoard.save();
    console.log("newBoard", newBoard);
    res.status(201).send("Board registered");
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/all", authenticateToken, async (req, res) => {
  const email = req.user?.email;
  const { role } = req.query;

  try {
    if (role === "employee") {
      const user = await User.findOne({ email: email });
      if (!user || !user.boards || user.boards.length === 0) {
        return res
          .status(200)
          .json({ message: "No boards found for employee" });
      }
      return res.status(200).json(user.boards); // ✅ Directly return employee boards
    } else {
      const allBoards = await Boards.find({ createdBy: email });

      if (!allBoards || allBoards.length === 0) {
        return res.status(200).json({ message: `{No boards found for ${email}` });
      }
      return res.status(200).json(allBoards); // ✅ Directly return admin boards
    }
  } catch (err) {
    console.error("Error fetching boards:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
