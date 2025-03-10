const nodemailer = require("nodemailer");
require("dotenv").config();

const sendEmail = async (to, subject, htmlContent) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail", // You can use other services like SendGrid
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log("transporter", transporter);
    await transporter.sendMail({
      from: '"Task Manager" <your-email@gmail.com>',
      to,
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = sendEmail;


// EMAIL_USER=teamsphere384@gmail.com
// EMAIL_PASS=TeamSphere123#