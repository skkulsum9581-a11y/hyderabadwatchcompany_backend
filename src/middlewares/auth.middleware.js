import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import { User } from "../models/users.model.js";

dotenv.config()




export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        if (!token) throw new ApiError(408, "(unauthorized token)no access token found at client side")
        // console.log(token)
        const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const db_user = await User.findById(decodedToken._id).select("-password -refreshToken")
        if (!db_user) throw new ApiError(409, "invalid access token ")
        req.user = db_user
        next()
    } catch (error) {
        throw new ApiError(401,error?.message || "invalid access token")
    }


})