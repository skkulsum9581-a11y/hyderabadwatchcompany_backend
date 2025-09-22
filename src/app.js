import express, { urlencoded } from 'express'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import cors from 'cors'
dotenv.config()
const app= express()


const allowedOrigins = process.env.CORS_ORIGIN.split(','); // split into array

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // allow Postman, curl, etc.
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));



app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

const sayhello=async (req,res)=>{
    res.status(200).json({message:"hello from me"})


}

app.get("/",sayhello)

// routes
import userRouter from './routes/user.routes.js'
app.use("/api/v1/users",userRouter)

import watchRouter from './routes/watch.routes.js'
app.use("/api/v1/watches",watchRouter)

import reviewRouter from './routes/review.routes.js'
app.use("/api/v1/reviews",reviewRouter)




export {app}