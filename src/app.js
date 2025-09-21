import express, { urlencoded } from 'express'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import cors from 'cors'
dotenv.config()
const app= express()
app.use(cors({origin:process.env.CORS_ORIGIN,credentials:true,sameSite: "None"}))
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

// routes
import userRouter from './routes/user.routes.js'
app.use("/api/v1/users",userRouter)

import watchRouter from './routes/watch.routes.js'
app.use("/api/v1/watches",watchRouter)

import reviewRouter from './routes/review.routes.js'
app.use("/api/v1/reviews",reviewRouter)




export {app}