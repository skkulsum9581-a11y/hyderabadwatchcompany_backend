import {Router} from 'express'

import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import { createReview } from '../controllers/review.controller.js'

const router = Router()

router.route("/create-review").post(verifyJWT,upload.array("media-review",5),createReview)





export default router