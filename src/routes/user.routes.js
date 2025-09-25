import {Router} from 'express'
import { emailRegisteration, isLoggedIn, loginUser, logoutUser, otp, otpForgotPassword, otpVerify, refreshAccessToken, registerUser, setNewPassword, updateAddressAndPhone, updateAvatar, updateEmail, updateName, updatePassword, updatePhoneNumber } from '../controllers/user.controller.js'
import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'

const router = Router()

router.route("/register").post(upload.fields([{name:"avatar",maxCount:1}]),registerUser)
router.route("/login").post(upload.fields([]),loginUser)
router.route("/logout").post(verifyJWT,logoutUser)

//secured routes
router.route("/refresh-token").post(refreshAccessToken)

//below route is when the user is logged in
router.route("/update-password").post(upload.fields([]),verifyJWT,updatePassword)

// below route is when the user has forgot the password and he is not logged in
router.route("/set-new-password").post(upload.fields([]),setNewPassword)

router.route("/update-email").post(upload.fields([]),verifyJWT,updateEmail)
router.route("/update-name").post(upload.fields([]),verifyJWT,updateName)
router.route("/update-phone-number").post(upload.fields([]),verifyJWT,updatePhoneNumber)
router.route("/update-address-and-phone").post(upload.fields([]),verifyJWT,updateAddressAndPhone)
router.route("/update-avatar").post(upload.fields([{name:"avatar",maxCount:1}]),verifyJWT,updateAvatar)
router.route("/otp").post(upload.fields([]),otp)

router.route("/otp-forgot-password").post(upload.fields([]),otpForgotPassword)
router.route("/is-logged-in").post(verifyJWT,isLoggedIn)
router.route("/otp-verify").post(upload.fields([]),otpVerify)
router.route("/email-registeration").post(upload.fields([]),emailRegisteration)


export default router