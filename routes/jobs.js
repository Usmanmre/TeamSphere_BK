import express from "express";
import Job from "../models/jobs.js";
import User from "../models/user.js";
import axios from "axios";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const SECRET_KEY = process.env.SECRET_KEY || "supersecretkey";

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

const router = express.Router();

router.post("/add", authenticateToken, async (req, res) => {
  try {
    const email = req.user?.email;
    const accessToken = req.user?.linkedinAccessToken; // You must store this securely

    const hiringManager = await User.findOne({ email });
    if (!hiringManager) {
      return res.status(404).json({ error: "Hiring manager not found" });
    }

    const job = new Job({
      ...req.body,
      hiringManager: hiringManager._id,
    });

    await job.save();

    res.status(201).json({
      job,
    });
  } catch (err) {
    console.error("Job creation error:", err);
    res.status(400).json({ error: err.message });
  }
});


async function postToLinkedIn({
  accessToken,
  personURN,
  jobTitle,
  jobLocation,
  companyName,
}) {
  const message = `🚀 We're hiring at ${companyName}! Join us as a ${jobTitle} in ${jobLocation}. Apply now.`;

  const payload = {
    author: personURN,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text: message,
        },
        shareMediaCategory: "NONE",
      },
    },
    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    },
  };

  const response = await axios.post(
    "https://api.linkedin.com/v2/ugcPosts",
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    }
  );

  return response.data;
}

router.get("/get/all", authenticateToken, async (req, res) => {
  try {
    const email = req.user?.email;

    // Find hiring manager by email
    const hiringManager = await User.findOne({ email });
    if (!hiringManager) {
      return res.status(404).json({ error: "Hiring manager not found" });
    }
    // Find all jobs where hiringManager matches the user's _id
    const allJobs = await Job.find({ hiringManager: hiringManager._id });

    res.status(200).json(allJobs);
  } catch (err) {
    console.error("Job retrieval error:", err);
    res.status(400).json({ error: err.message });
  }
});

router.get("/get/all-posted", authenticateToken, async (req, res) => {
  try {
    const allJobs = await Job.find();
    res.status(200).json(allJobs);
  } catch (err) {
    console.error("Job retrieval error:", err);
    res.status(400).json({ error: err.message });
  }
});

router.get("/single/:id", authenticateToken, async (req, res) => {
  try {
    const jobId = req.params.id;
    console.log('jobId', jobId)
    const singleJob = await Job.findOne({_id: new mongoose.Types.ObjectId(jobId)});
    res.status(200).json(singleJob);
  } catch (err) {
    console.error("Job retrieval error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
