const axios = require("axios");
const express = require("express");
const router = express.Router();

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
router.get("/callback", authenticateToken, async (req, res) => {
  const { code } = req.query;
  console.log('code', code)
  const redirect_uri = process.env.ZOOM_REDIRECT_URI;

  try {
    const response = await axios.post(
      `https://zoom.us/oauth/token?grant_type=authorization_code&code=${code}&redirect_uri=${redirect_uri}`,
      {},
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
            ).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token } = response.data;
    res.json({ access_token });
  } catch (err) {
    console.error(err.response.data);
    res.status(500).json({ error: "Failed to get Zoom access token" });
  }
});

router.get("/create-meeting", authenticateToken, async (req, res) => {
  const { access_token, topic } = req.body;

  try {
    const response = await axios.post(
      "https://api.zoom.us/v2/users/me/meetings",
      {
        topic: topic || "New Meeting",
        type: 1,
        settings: {
          host_video: true,
          participant_video: true,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Meeting creation failed:", error.response.data);
    res.status(500).json({ error: "Meeting creation failed" });
  }
});

module.exports = router;
