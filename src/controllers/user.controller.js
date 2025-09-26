import { User } from "../models/users.model.js";
import { ApiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv"
import Verification from "../models/verification.model.js";
import { sendOTPEmail } from "../utils/sendOtp.js";
import { Payment } from "../models/payment.model.js";
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
    const { email, name, password } = req.body
    if ([email, name, password].some((field) => !field || field.trim() === "")) {
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
        verified: true,
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
    const options = { httpOnly: true, secure: false, sameSite: "Lax" }
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


// this is when user is already logged in 
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

// this is when the user forgets the password and he is not logged in
const setNewPassword = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const db_user = await User.findOne({ email });
    if (!db_user) throw new ApiError(404, "The user does not exist");

    // Update password directly on the document
    db_user.password = password;

    // Save the document so pre-save middleware hashes it
    await db_user.save();

    res.status(200).json(new apiResponse(200, { success: true }));
});

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
        db_user.verified = false
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

const updateAddressAndPhone = asyncHandler(async (req, res) => {
    try {
        console.log("starting of the function")
        const { address_, phone_ } = req.body
        // console.log(Newemail)
        if (address_.trim() === "") throw new ApiError(400, "provided an empty address")
        console.log("good so far")
        const db_user = await User.findById(req.user?._id)
        if (!db_user) throw new ApiError(405, "unauthorized request .. ")
        console.log(db_user)
        db_user.address = address_
        db_user.phone_no = phone_
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
        const { user_email } = req.body
        console.log(user_email)
        const otp_ = generateOTP()
        const now = new Date()
        const expiry_ = new Date(now.getTime() + 5 * 60 * 1000);
        await Verification.create({ email: user_email, otp: otp_, expiry: expiry_ })
        sendOTPEmail(user_email, otp_)

        return res
            .status(200)
            .json(new apiResponse(200, {}, "otp sent successfully"))
    } catch (error) {
        throw new ApiError(500, error.message || "unable to send otp")
    }

})

const otpForgotPassword = asyncHandler(async (req, res) => {
    try {

        const { user_email } = req.body
        console.log(user_email)
        const db_user = await User.findOne({ email: user_email })
        if (!db_user) throw new ApiError(401, "user is not found")
        const otp_ = generateOTP()
        const now = new Date()
        const expiry_ = new Date(now.getTime() + 5 * 60 * 1000);
        await Verification.create({ email: user_email, otp: otp_, expiry: expiry_ })
        sendOTPEmail(user_email, otp_)

        return res
            .status(200)
            .json(new apiResponse(200, {}, "otp sent successfully"))
    } catch (error) {
        throw new ApiError(500, error.message || "unable to send otp")
    }

})

const otpVerify = asyncHandler(async (req, res) => {
    const { otp_, email } = req.body;

    // Validate input
    if (!otp_ || otp_.trim() === "") throw new ApiError(400, "provided an empty otp");
    if (!email || email.trim() === "") throw new ApiError(400, "provided an empty email");

    // Find OTP
    const verify = await Verification.findOne({ email, otp: otp_ });
    if (!verify) throw new ApiError(402, "invalid otp code");

    // Check expiry
    if (verify.expiry < new Date()) throw new ApiError(405, "the otp has expired");

    // Delete all OTPs for this email
    await Verification.deleteMany({ email });

    // Success response
    return res.status(200).json(
        new apiResponse(200, { email, verified: true }, "successfully verified the user")
    );
});


const isLoggedIn = asyncHandler(async (req, res) => {
    try {

        const db_user = await User.findById(req.user?._id)
        if (!db_user) throw new ApiError(405, "unauthorized request .. ")
        console.log(db_user)
        const flag = true

        return res
            .status(200)
            .json(new apiResponse(200, { verify: flag }, "successfully updated the email"))
    } catch (error) {
        throw new ApiError(500, error.message || "something went wrong while updating the email")
    }


})


// this is useless 
const emailRegisteration = asyncHandler(async (req, res) => {
    const { email } = req.body
    console.log(email)
    res.status(200)
        .json(new apiResponse(200, { message: "ok" }, "successfully registered the email"))
})

const paymentScreenShort = asyncHandler(async (req, res) => {
   
     const db_user = await User.findById(req.user?._id)
    if (!db_user) throw new ApiError(405, "unauthorized request .. ")
    
    const {total_amount}= req.body

    let cloudinaryResponse = ""

    if ((req?.files?.paymentScreenshot?.length)) {
        const filePath = req.files?.paymentScreenshot[0]?.path
        console.log(filePath)
        const response = await uploadOnCloudinary(filePath)
        if (!response) throw new ApiError(501, "the file wasnt uploaded on cloudinary")
        cloudinaryResponse = response
    }
    console.log("this is response of cloudinary upload", cloudinaryResponse)

    if(cloudinaryResponse=="") throw new ApiError(501,"the screenshot was not uploaded on cloudinary")
    if(db_user.verified==false) throw new ApiError(403, "the user is not verified")
    
    const paymentEntry= await Payment.create({
        user_id:db_user._id,
        name:db_user.name,
        email:db_user.email,
        payment_screenshot:cloudinaryResponse,
        address:db_user.address,
        phone:db_user.phone_no,
        amount:total_amount,
        payment_cart:db_user.cart

    })

    const confirm_paymentEntry = await Payment.findById(paymentEntry._id)
    if(!confirm_paymentEntry) throw new ApiError(500,"the payment entry was not saved in the database")

    res.status(200).json(new apiResponse(200,{confirm_paymentEntry},"successfully saved your payment information"))


})




export {
    registerUser, loginUser, logoutUser, refreshAccessToken, updatePassword,
    updateEmail, updateName, updateAddressAndPhone, updatePhoneNumber, updateAvatar, otp,
    otpVerify, isLoggedIn, emailRegisteration, otpForgotPassword, setNewPassword, paymentScreenShort
}