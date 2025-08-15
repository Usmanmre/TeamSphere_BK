// auth.js
import dotenv from "dotenv";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

dotenv.config();

const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || "supersecretkey";
const REFRESH_SECRET_KEY =
  process.env.REFRESH_SECRET_KEY || "superrefreshsecretkey";

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

router.post("/register", async (req, res) => {
  console.log('here')
  const { name, email, role, password } = req.body;

  try {
    // Validate required fields
    if (!name || !email || !role || !password) {
      return res
        .status(400)
        .json({ status: "error", message: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ status: "error", message: "User already exists" });
    }

    // Hash the password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({ name, email, role, password: hashedPassword });
    await user.save();

    // Generate JWT Token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    // Exclude password from response
    const { password: _, ...userWithoutPassword } = user.toObject();

    // Send success response
    res.status(201).json({
      status: "success",
      message: "User registered successfully",
      token,
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

router.get("/getTeam", authenticateToken, async (req, res) => {
  const email = req.user?.email;

  try {
    const user = await User.findOne({ email });
    const teamMembers = user?.team;
    res.status(200).send(teamMembers);
  } catch (err) {
    res.status(400).send("Error getting team");
  }
});

router.post("/addTeam", authenticateToken, async (req, res) => {
  const teamMembers = req.body; // Array of emails
  const email = req.user?.email;

  try {
    // ✅ Find user in the database
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Extract existing team emails
    const existingTeamEmails = new Set(user.team.map((member) => member.email));
    // ✅ Filter out duplicate emails
    const newTeamMembers = teamMembers
      .filter((memberEmail) => !existingTeamEmails.has(memberEmail))
      .map((email) => ({ email }));

    if (newTeamMembers.length > 0) {
      // ✅ Add new members
      user.team.push(...newTeamMembers);
      await user.save();
      console.log(`✅ Added ${newTeamMembers.length} new team members.`);

      return res.status(201).json({
        message: `${newTeamMembers.length} new team members added.`,
        user,
      });
    }

    console.log("✅ No new team members to add.");
    return res.status(200).json({
      message: "All members already exist in the team.",
      user,
    });
  } catch (err) {
    console.error("❌ Error updating user:", err);
    return res.status(500).json({
      message: "Internal server error.",
      error: err.message,
    });
  }
});

// Login Route
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ status: "error", message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ status: "error", message: "Invalid credentials" });
    }

    // Create tokens
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      SECRET_KEY,
      { expiresIn: "5m" }
    );

    const refreshToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      REFRESH_SECRET_KEY,
      {
        expiresIn: "7d",
      }
    );

    // Store refresh token in cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax", // or "None" if cross-origin
    });

    const { password: _, ...userWithoutPassword } = user.toObject();

    // Final response (only one)
    return res.status(200).json({
      status: "success",
      message: "Login successful",
      token,
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error("Login Error:", err.message);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
});

router.post("/refresh-token", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(401);

  jwt.verify(refreshToken, REFRESH_SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.json({ accessToken: newAccessToken });
  });
});

// Protected Route
router.put("/logout", authenticateToken, (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
});

export default router;
