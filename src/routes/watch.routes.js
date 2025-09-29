import {Router} from 'express'

import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { addToUserCart, addWatch, addWatchToWishList, fetchWatchesByCategory, getAllWatches, getUserCart, getUserWishlist, removeFromUserCart, removeWatchFromWishList, searchWatch, singleWatchInformation } from '../controllers/watch.controller.js'

const router = Router()

//handling watches in the database
router.route("/add-watch").post(upload.array("media",5),addWatch)
router.route("/get-all-watches").get(getAllWatches)
router.route("/single-watch-information/:watchid").get(singleWatchInformation) 
router.route("/search-watch/:userText").post(searchWatch) 
router.route("/fetch-watches-by-category/:category/:gender").post(fetchWatchesByCategory) 

//handling user wishlish
router.route("/add-watch-to-wishlist/:watchid").post(verifyJWT,addWatchToWishList)   // this is how params are received
router.route("/remove-watch-from-wishlist/:watchid").post(verifyJWT,removeWatchFromWishList) 
router.route("/get-user-wishlist").post(verifyJWT,getUserWishlist) 

// handling user cart 
router.route("/add-to-user-cart/:watchid").post(verifyJWT,addToUserCart)   
router.route("/remove-from-user-cart/:watchid").post(verifyJWT,removeFromUserCart) 
router.route("/get-user-cart").get(verifyJWT,getUserCart) 




// router.route("/login").post(upload.fields([]),loginUser)
// router.route("/logout").post(verifyJWT,logoutUser)

// //secured routes
// router.route("/refresh-token").post(refreshAccessToken)
// router.route("/forgot-password").post(forgotPassword)

// router.route("/update-password").post(upload.fields([]),verifyJWT,updatePassword)
// router.route("/update-email").post(upload.fields([]),verifyJWT,updateEmail)
// router.route("/update-name").post(upload.fields([]),verifyJWT,updateName)
// router.route("/update-phone-number").post(upload.fields([]),verifyJWT,updatePhoneNumber)
// router.route("/update-address").post(upload.fields([]),verifyJWT,updateAddress)
// router.route("/update-avatar").post(upload.fields([{name:"avatar",maxCount:1}]),verifyJWT,updateAvatar)
// router.route("/otp").post(verifyJWT,otp)
// router.route("/otp-verify").post(upload.fields([]),verifyJWT,otpVerify)


export default router