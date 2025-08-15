import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs
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

export default mongoose.model('Boards', BoardSchema)