import { User } from "../models/users.model.js";
import { ApiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv"
// import Verification from "../models/verification.model.js";
// import { sendOTPEmail } from "../utils/sendOtp.js";
import { Watch } from "../models/watches.model.js";
import { Review } from "../models/reviews.model.js";

const createReview = asyncHandler(async (req, res) => {

    if (!req?.user?._id) console.log("you cant review because you are not authorized user")
    const { text, ratings, wid } = req.body


    const watch_db = await Watch.findById(wid)
    if (!watch_db) throw new ApiError(501, "the watch does not exist")
        
    const created_review = await Review.create({
        wid:wid,
        user_id:req.user._id,
        text:text,
        rating:ratings,

    })

    console.log(created_review)


    console.log(text, ratings, wid)
    return res
        .status(200)
        .json(new apiResponse(200, {created_review}, "review created successfully"))


})


export { createReview }
// controllers needed for

// adding the watches to database
// retreiving the watches from the database
// editing the information of the watches .. if entered wrong (title,price,brand,images etc)
// deleting the watches from the data base
















//controllers needed for

// adding a review in the database
// editing the review --- client -- user controls  ( upadating the text, updating the image, updating the rating .. and so on)
// deleting the review .. ( only the one who reviewed the the watch can delete the review)
// retreiving the reviews of the watches ..

