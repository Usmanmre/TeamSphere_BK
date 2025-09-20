import nodemailer from "nodemailer";
import dotenv from "dotenv";
import Notification from "../models/notification.js";

dotenv.config();

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

// Helper function to create notifications
const createNotification = async (
  assignedTo,
  createdBy,
  type,
  message,
  options = {},
) => {

  const notificationData = {
    assignedTo,
    createdBy,
    type,
    message,
    isRead: false,
    isUpdated: false,
    ...options,
    lastModifiedBy: createdBy, // Set after spreading options
  };

  const notification = new Notification(notificationData);
  return await notification.save();
};

export { sendEmail, createNotification };

// EMAIL_USER=teamsphere384@gmail.com
// EMAIL_PASS=TeamSphere123#
