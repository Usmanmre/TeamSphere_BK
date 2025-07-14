require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Boards = require("../models/board");
const User = require("../models/user");
const router = express.Router();
const SECRET_KEY = process.env.SECRET_KEY || "supersecretkey";
const onlineUsers = require("../sockets/onlineUsers"); // or wherever app.js lives
const Donations = require("../models/donations");
const { createNotification } = require("../utility/Email");


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

router.post("/create/donation-pool", authenticateToken, async (req, res) => {
  const { title, description, amount } = req.body;
  const createdBy = req.user?.email;
  if (!title || !description) {
    return res.status(400).json({ message: "All fields are required" });
  }
  try {
    const newDonationPool = new Donations({ title, description, amount, createdBy });
    const savedDonationPool = await newDonationPool.save();
    const user = await User.findOne({email: createdBy});
    
    // Send notifications to team members
    if (user && user.team && user.team.length > 0) {
      const notificationPromises = user.team.map(async (teamMember) => {
        return createNotification(
          teamMember.email,
          createdBy,
          "donation_pool",
          `${user.name} created a new donation pool: "${title}"`,
          { donationPool: savedDonationPool._id }
        );
      });
      
      await Promise.all(notificationPromises);
    }
    
    res.status(201).json({ message: "Donation pool created" });
  } catch (err) {
    res.status(500).json({ message: "Error creating donation pool", error: err.message });
  }
});

router.get("/all/donation-pools", authenticateToken, async (req, res) => {

  if  (req.user?.role == 'employee'){
  const managerID = req.user?.managerID;
  const managerInfo = await User.findOne(managerID);
  console.log('object', managerInfo);
  const donationPools = await Donations.find({createdBy: managerInfo?.email});
    res.status(200).json(donationPools);

  } else{

    const donationPools = await Donations.find({createdBy: req.user?.email});
    res.status(200).json(donationPools);
    console.log('donationPools',donationPools);
  }
});

router.get("/pool/:id", authenticateToken, async (req, res) => {

  const donationPools = await Donations.find({_id: req.params.id});
  res.status(200).json(donationPools);
  console.log('donationPools',donationPools);

});


module.exports = router;