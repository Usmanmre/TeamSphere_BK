const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DonationsSchema = new Schema(
    {
      title: { type: String, required: true },
      description: { type: String, required: true },
      amount: { type: Number, required: true },
      createdBy: { type: String, required: true },
      createdAt: { type: Date, default: Date.now }, // Timestamp
      updatedAt: { type: Date, default: Date.now }, // Timestamp
   
    },
    { timestamps: true }
    
  ); 
  
  module.exports = mongoose.model("Donations", DonationsSchema);