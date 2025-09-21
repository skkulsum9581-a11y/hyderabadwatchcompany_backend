import { User } from "../models/users.model.js";
import { ApiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv"
import Verification from "../models/verification.model.js";
import { sendOTPEmail } from "../utils/sendOtp.js";
dotenv.config()

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { refreshToken, accessToken }

    } catch (error) {
        throw new ApiError(500, "error while generating refresh and accesstoken")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { email, name, password, phone_no } = req.body
    if ([email, name, password, phone_no].some((field) => field.trim() === "")) {
        throw new ApiError(400, "all fields are mandetory")
    }

    const existedUser = await User.findOne({ email })
    if (existedUser) {
        throw new ApiError(401, "the user already exists")
    }
    else {
        console.log("the user does not exist .. you are new")
    }
    // console.log(existedUser)


    let cloudinaryResponse = ""

    if ((req?.files?.avatar?.length)) {
        const filePath = req.files?.avatar[0]?.path
        console.log(filePath)
        const response = await uploadOnCloudinary(filePath)
        if (!response) throw new ApiError(501, "the file wasnt uploaded on cloudinary")
        cloudinaryResponse = response
    }
    console.log("this is response of cloudinary upload", cloudinaryResponse)

    const db_User_created = await User.create({
        email: email,
        name: name,
        password: password,
        phone_no: phone_no,
        avatar: cloudinaryResponse || ""

    })

    const confirm_db_user = await User.findById(db_User_created._id).select("-password -refreshToken ")
    if (!confirm_db_user) throw ApiError(501, "error while storing the userdata in database")
    console.log(confirm_db_user)
    return res.status(200).json(new apiResponse(201, confirm_db_user, "user registered successfully"))








})

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body
    // console.log(email,password)
    if (!(email && password)) {
        throw new ApiError(403, "email or passoword field is not passed")
    }

    const verification_user = await User.findOne({ email })
    if (!verification_user) throw new ApiError(404, "user does not exist")

    // console.log(verification_user)
    const check = await verification_user.comparePassword(password)

    // console.log(check)
    if (!check) throw new ApiError(405, "your password is incorrect")
    const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(verification_user._id)
    console.log("accesstoken=", accessToken)
    console.log("refreshtoken=", refreshToken)

    verification_user.refreshToken = refreshToken
    await verification_user.save()
    const logedInUser = await User.findById(verification_user._id).select("-password -refreshToken")
    const options = { httpsOnly: true, secure: true,sameSite:"None" }
    res.status(207)
        .cookie("refreshToken", refreshToken, options)
        .cookie("accessToken", accessToken, options)
        .json(new apiResponse(200, { user: logedInUser, refreshToken, accessToken }))




    //get email and password from the req.body
    //check if none of them are empty
    //check if email already exists in the database
    //hash the password and compare  with the db_stored password hash
    //if passwords do not match .. inform --incorrect password
    //get the id and other information of the user corresponding to the email
    //generate refresh and accesstokens
    //save the refresh token in the database 
    //send the refresh and accesstoken to the client cookies
    // res.status(201).json({message:"everything is alright dude"})
})

const logoutUser = asyncHandler(async (req, res) => {
    const logged_out_user = await User.findByIdAndUpdate(req.user._id, { $set: { refreshToken: "" } }, { new: true })
    console.log(logged_out_user)
    const options = { httpOnly: true, secure: true }
    return res
        .status(200)
        .clearCookie("refreshToken", options)
        .clearCookie("accessToken", options)
        .json(new apiResponse(201, {}, "user logged out successfully"))


})

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body?.refreshToken
        if (!incomingRefreshToken) throw new ApiError(401, "no refresh token on client side, unauthorized request")
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user_from_db = await User.findById(decodedToken?._id)
        if (!user_from_db) throw new ApiError(402, "there is no such user in db, invalid refresh token, unauthorized request")
        console.log(user_from_db)
        if (incomingRefreshToken !== user_from_db?.refreshToken) throw new ApiError(403, "the refresh token does not match, either token expired or it is fictitious, unauthorized request")
        const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(user_from_db?._id)
        const options = { httpOnly: true, secure: true }
        return res
            .status(200)
            .cookie("refreshToken", refreshToken, options)
            .cookie("accessToken", accessToken, options)
            .json(new apiResponse(201, { accessToken, refreshToken }, "access token refreshed"))
    } catch (error) {
        throw new ApiError(401, error?.message || "something went wrong while refreshing the access token")

    }



})

const updatePassword = asyncHandler(async (req, res) => {
    try {
        const { newPassword, oldPassword } = req.body
        if ([newPassword, oldPassword].some((field) => field.trim() === "")) throw new ApiError(400, "either the oldpassword or the new password is empty")
        const db_user = await User.findById(req.user?._id)
        if (!db_user) throw new ApiError(405, "unauthorized request .. ")
        const verify = await db_user.comparePassword(oldPassword)
        if (!verify) throw new ApiError(406, "passwords does not match")
        db_user.password = newPassword
        await db_user.save()
        const diff_db_user = await User.findById(req.user?._id).select("-password -refreshToken")
        return res
            .status(200)
            .json(new apiResponse(200, { diff_db_user }, "successfully updated the password"))
    } catch (error) {
        throw new ApiError(500, "something went wrong while updating the password")
    }


})

const forgotPassword = asyncHandler(async (req, res) => {

})

const updateEmail = asyncHandler(async (req, res) => {
    try {
        console.log("starting of the function")
        const { Newemail } = req.body
        console.log(Newemail)
        if (Newemail.trim() === "") throw new ApiError(400, "provided an empty email")
        console.log("good so far")
        const db_user = await User.findById(req.user?._id)
        if (!db_user) throw new ApiError(405, "unauthorized request .. ")
        console.log(db_user)
        db_user.email = Newemail
        db_user.verified=false
        await db_user.save()
        const diff_db_user = await User.findById(req.user?._id).select("-password -refreshToken")
        return res
            .status(200)
            .json(new apiResponse(200, { diff_db_user }, "successfully updated the email"))
    } catch (error) {
        throw new ApiError(500, error.message || "something went wrong while updating the email")
    }


})

const updateName = asyncHandler(async (req, res) => {
    try {
        console.log("starting of the function")
        const { fullName } = req.body
        // console.log(Newemail)
        if (fullName.trim() === "") throw new ApiError(400, "provided empty stirng")
        console.log("good so far")
        const db_user = await User.findById(req.user?._id)
        if (!db_user) throw new ApiError(405, "unauthorized request .. ")
        console.log(db_user)
        db_user.name = fullName
        await db_user.save()
        const diff_db_user = await User.findById(req.user?._id).select("-password -refreshToken")
        return res
            .status(200)
            .json(new apiResponse(200, { diff_db_user }, "successfully updated the name"))
    } catch (error) {
        throw new ApiError(500, error.message || "something went wrong while updating the name")
    }

})
const updatePhoneNumber = asyncHandler(async (req, res) => {
    try {
        console.log("starting of the function")
        const { phone_number } = req.body
        // console.log(Newemail)
        if (phone_number.trim() === "") throw new ApiError(400, "provided no")
        console.log("good so far")
        const db_user = await User.findById(req.user?._id)
        if (!db_user) throw new ApiError(405, "unauthorized request .. ")
        console.log(db_user)
        db_user.phone_no = phone_number
        await db_user.save()
        const diff_db_user = await User.findById(req.user?._id).select("-password -refreshToken")
        return res
            .status(200)
            .json(new apiResponse(200, { diff_db_user }, "successfully updated the phone number"))
    } catch (error) {
        throw new ApiError(500, error.message || "something went wrong while updating the phone number")
    }

})

const updateAddress = asyncHandler(async (req, res) => {
    try {
        console.log("starting of the function")
        const { address_ } = req.body
        // console.log(Newemail)
        if (address_.trim() === "") throw new ApiError(400, "provided an empty address")
        console.log("good so far")
        const db_user = await User.findById(req.user?._id)
        if (!db_user) throw new ApiError(405, "unauthorized request .. ")
        console.log(db_user)
        db_user.address = address_
        await db_user.save()
        const diff_db_user = await User.findById(req.user?._id).select("-password -refreshToken")
        return res
            .status(200)
            .json(new apiResponse(200, { diff_db_user }, "successfully updated the address"))
    } catch (error) {
        throw new ApiError(500, error.message || "something went wrong while updating the address")
    }

})

const updateAvatar = asyncHandler(async (req, res) => {
    let cloudinaryResponse = ""

    const db_user = await User.findById(req.user?._id)
    if (!db_user) throw new ApiError(405, "unauthorized request .. ")


    if ((req?.files?.avatar?.length)) {
        const filePath = req.files?.avatar[0]?.path
        console.log(filePath)
        const response = await uploadOnCloudinary(filePath)
        if (!response) throw new ApiError(501, "the file wasnt uploaded on cloudinary")
        cloudinaryResponse = response
    }

    if (!cloudinaryResponse == "") {
        console.log("the images is actually uploaded by the user")
        console.log("this is the response of cloudinary inside the function", cloudinaryResponse)
        db_user.avatar = cloudinaryResponse
        await db_user.save()
    }

    const updatedUser = await User.findById(db_user._id).select("-password -refreshToken")


    return res
        .status(200)
        .json(new apiResponse(200, { updatedUser }, "avatar upload "))

})

const otp = asyncHandler(async (req, res) => {
    try {
        // console.log("starting of the function")
        // const {email_}=req.body
        // // console.log(Newemail)
        // if(email_.trim()==="") throw new ApiError(400,"provided an empty address")
        // console.log("good so far")

        // const db_user= await User.findById(req.user?._id)
        // if(!db_user) throw new ApiError(405,"unauthorized request .. ")

        // console.log(db_user)
        // db_user.address=address_
        // await db_user.save()
        // const diff_db_user= await User.findById(req.user?._id).select("-password -refreshToken")
        const user_email = req?.user?.email
        const otp_ = generateOTP()
        const now= new Date()
        const expiry_ = new Date(now.getTime() + 5 * 60 * 1000);
        await Verification.create({ email: user_email, otp: otp_, expiry: expiry_ })
        sendOTPEmail(user_email,otp_)

        return res
            .status(200)
            .json(new apiResponse(200, { }, "otp sent successfully"))
    } catch (error) {
        throw new ApiError(500, error.message || "unable to send otp")
    }

})

const otpVerify = asyncHandler(async (req, res) => {
    try {
        console.log("starting of the function")
        const { otp_ } = req.body
        // console.log(Newemail)
        if (otp_.trim() === "") throw new ApiError(400, "provided an empty otp")
        console.log("good so far")

        const user_email= req.user?.email
        const verify= await Verification.findOne({
            email:user_email,
            otp:otp_
        })

       if(!verify) throw new ApiError(402,"invalid otp code ")
        const now = new Date()
        if(verify.expiry<now){
            throw new ApiError(405,"the otp has expired")
        }

        try {
            await Verification.deleteMany({email:user_email})
        } catch (error) {
            throw new ApiError(201,"failed to delete all the otp entries corresponding to the email")
        }

        const db_user= await User.findOne({email:user_email})
        db_user.verified=true
        await db_user.save()

        return res
            .status(200)
            .json(new apiResponse(200, { db_user}, "successfully verified the user"))
    } catch (error) {
        throw new ApiError(500, error.message || "unsuccessful verificaion of the user email")
    }

})

const isLoggedIn = asyncHandler(async (req, res) => {
    try {
      
        const db_user = await User.findById(req.user?._id)
        if (!db_user) throw new ApiError(405, "unauthorized request .. ")
        console.log(db_user)
        const flag=true
       
        return res
            .status(200)
            .json(new apiResponse(200, { verify:flag }, "successfully updated the email"))
    } catch (error) {
        throw new ApiError(500, error.message || "something went wrong while updating the email")
    }


})




export {
    registerUser, loginUser, logoutUser, refreshAccessToken, updatePassword,
    forgotPassword, updateEmail, updateName, updateAddress, updatePhoneNumber, updateAvatar,otp , otpVerify, isLoggedIn
}