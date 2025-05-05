// auth.js
require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Boards = require("../models/board");
const User = require("../models/user");
const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || "supersecretkey";
const onlineUsers = require("../sockets/onlineUsers"); // or wherever app.js lives

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
  const { title } = req.body;
  const createdBy = req.user?.email;

  if (!title) {
    return res.status(400).json({ message: "Title required" });
  }

  try {
    const newBoard = new Boards({ title, createdBy });
    const savedBoard = await newBoard.save();

    // Assign MongoDB's _id to boardID
    savedBoard.boardID = savedBoard._id;
    await savedBoard.save();

    res
      .status(201)
      .json({ message: "Board registered", boardID: savedBoard.boardID });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating board", error: err.message });
  }
});

router.get("/all", authenticateToken, async (req, res) => {
  
  const email = req.user?.email;
  const { role } = req.query;
  const onlineEmails = Array.from(onlineUsers.keys());
  const filteredOnlineEmails = onlineEmails.filter((e) => e !== email);
  try {
    if (role === "employee") {
      const user = await User.findOne({ email: email });
      if (!user || !user.boards || user.boards.length === 0) {
        return res
          .status(200)
          .json({ message: "No boards found for employee" });
      }
      return res
        .status(200)
        .json({ allBoards: user.boards, onlineUsers: filteredOnlineEmails }); // ✅ Directly return employee boards
    } else {
      const allBoards = await Boards.find({ createdBy: email });
      if (!allBoards || allBoards.length === 0) {
        return res
          .status(200)
          .json({ message: `{No boards found for ${email}` });
      }
      return res.status(200).json({
        allBoards,
        onlineUsers: filteredOnlineEmails, // convert Map to plain object
      }); // ✅ Directly return admin boards
    }
  } catch (err) {
    console.error("Error fetching boards:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
