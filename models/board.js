const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs
const Schema = mongoose.Schema;
const BoardSchema = new Schema({

    title: {
        type: String,
        required: true,
       },
       createdBy: {
        type: String,
        required: true,
       },
       boardID: {
        type: String,

       }
   
})

module.exports = mongoose.model('Boards', BoardSchema)