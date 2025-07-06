// models/Job.js
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    required: true,
  },
  requiredSkills: {
    type: [String], // array of skills
    default: [],
  },
  location: {
    type: String,
    trim: true,
    default: 'Remote', // or Onsite, Hybrid, etc.
  },
  salaryRange: {
    min: { type: Number, min: 0 },
    max: { type: Number, min: 0 },
  },
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'],
    default: 'Full-time',
  },
  hiringManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Filled', 'On Hold', 'Closed'],
    default: 'Open',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Update updatedAt on save
jobSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
