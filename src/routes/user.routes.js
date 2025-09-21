import {Router} from 'express'
import { forgotPassword, isLoggedIn, loginUser, logoutUser, otp, otpVerify, refreshAccessToken, registerUser, updateAddress, updateAvatar, updateEmail, updateName, updatePassword, updatePhoneNumber } from '../controllers/user.controller.js'
import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'

const router = Router()

router.route("/register").post(upload.fields([{name:"avatar",maxCount:1}]),registerUser)
router.route("/login").post(upload.fields([]),loginUser)
router.route("/logout").post(verifyJWT,logoutUser)

//secured routes
router.route("/refresh-token").post(refreshAccessToken)
router.route("/forgot-password").post(forgotPassword)

router.route("/update-password").post(upload.fields([]),verifyJWT,updatePassword)
router.route("/update-email").post(upload.fields([]),verifyJWT,updateEmail)
router.route("/update-name").post(upload.fields([]),verifyJWT,updateName)
router.route("/update-phone-number").post(upload.fields([]),verifyJWT,updatePhoneNumber)
router.route("/update-address").post(upload.fields([]),verifyJWT,updateAddress)
router.route("/update-avatar").post(upload.fields([{name:"avatar",maxCount:1}]),verifyJWT,updateAvatar)
router.route("/otp").post(verifyJWT,otp)
router.route("/is-logged-in").post(verifyJWT,isLoggedIn)
router.route("/otp-verify").post(upload.fields([]),verifyJWT,otpVerify)


export default router