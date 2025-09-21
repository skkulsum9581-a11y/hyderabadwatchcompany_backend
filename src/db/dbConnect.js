import mongoose from "mongoose"
import dotenv from "dotenv"
dotenv.config()
import { DB_NAME } from '../constants.js';
const dbConnect= async()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URL}${DB_NAME}`)
        
    } catch (error) {
        console.log(error,"error while connecting to the database")
        
    }
}

export default dbConnect