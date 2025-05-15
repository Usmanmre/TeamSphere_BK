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
router.get("/callback", async (req, res) => {
    const { code } = req.query;
    const redirect_uri = process.env.ZOOM_REDIRECT_URI;
  
    try {
      const tokenResponse = await axios.post(
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
  
      const { access_token } = tokenResponse.data;
  
      const meetingResponse = await axios.post(
        "https://api.zoom.us/v2/users/me/meetings",
        {
          topic: "Auto Created Meeting",
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
  
      const meeting = meetingResponse.data;
  
      // Send a script that will post message to the opener
      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'zoom-auth-success',
                meeting: ${JSON.stringify(meeting)}
              }, '*');
              window.close();
            </script>
            <p>Meeting created! You can close this tab.</p>
          </body>
        </html>
      `);
    } catch (err) {
      console.error("Zoom error:", err.response?.data || err.message);
      res.status(500).send("Failed to generate token or create meeting");
    }
  });
  

module.exports = router;
