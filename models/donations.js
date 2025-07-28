const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DonationsSchema = new Schema(
    {
      title: { type: String, required: true },
      description: { type: String, required: true },
      amount: { type: Number, required: true }, // Target amount
      totalAmount: { type: Number, default: 0 }, // Total amount collected
      currentAmount: { type: Number, default: 0 }, // Current amount collected
      createdBy: { type: String, required: true },
      status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
      donations: [{
        donorEmail: { type: String, required: true },
        donorName: { type: String, required: true },
        amount: { type: Number, required: true },
        paymentIntentId: { type: String },
        paymentStatus: { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending' },
        donatedAt: { type: Date, default: Date.now }
      }],
      createdAt: { type: Date, default: Date.now }, // Timestamp
      updatedAt: { type: Date, default: Date.now }, // Timestamp
   
    },
    { timestamps: true }
    
  ); 
  
  module.exports = mongoose.model("Donations", DonationsSchema);