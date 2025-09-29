import { User } from "../models/users.model.js";
import { ApiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv"
import Verification from "../models/verification.model.js";
import { sendOTPEmail } from "../utils/sendOtp.js";
import { Watch } from "../models/watches.model.js";

const addWatch = asyncHandler(async (req, res) => {
  const { title, price, description, brand, forWhom, category, discounted_price } = req.body
  if ([title, price, description, brand, forWhom, category, discounted_price].some((field) => field.trim() === "")) throw new ApiError(401, "please enter all the fields")
  // console.log({title,price,description_short,description_long,brand,forWhom,category})


  if (req.files.length < 5) {
    throw new ApiError(409, "please upload 5 multimedia files (img,video)");
  }

  let videoPath = "";
  const images = [];

  req.files.forEach(file => {
    if (file.mimetype.startsWith("image/")) {
      images.push(`${file.destination}/${file.filename}`);
    } else if (file.mimetype === "video/mp4") {
      videoPath = `${file.destination}/${file.filename}`;
    }
  });

  console.log("Images:", images);
  console.log("Video:", videoPath);

  let cloudinary_images = [];
  let cloudinary_video = "";

  // Upload all images in parallel
  cloudinary_images = await Promise.all(
    images.map(async (img_path) => {
      const response = await uploadOnCloudinary(img_path);
      if (!response) throw new ApiError(501, "the file wasn't uploaded on cloudinary");
      return response;
    })
  );

  // Upload video
  cloudinary_video = await uploadOnCloudinary(videoPath);
  if (!cloudinary_video) {
    throw new ApiError(502, "the video wasn't uploaded on cloudinary");
  }

  console.log("Uploaded images:", cloudinary_images);
  console.log("Uploaded video:", cloudinary_video);


  const newWatch = await Watch.create({
    title: title,
    price: price,
    discounted_price: discounted_price,
    description: description,
    brand: brand,
    category: category,
    forWhom: forWhom,
    images: cloudinary_images,
    video: cloudinary_video, // or just cloudinary_video if you return only the URL
  });


  return res
    .status(200)
    .json(new apiResponse(200, { newWatch }, "everything going smoothly"))


})

const getAllWatches = asyncHandler(async (req, res) => {
  const allWatches = await Watch.find({})
  res
    .status(200)
    .json(new apiResponse(200, { allWatches }, "these are all the watches that i have"))
})


const singleWatchInformation = asyncHandler(async (req, res) => {
  const watchId = req.params.watchid;

  const activeWatch = await Watch.findById(watchId);
  if (!activeWatch) {
    throw new ApiError(403, "watch is not in the database");
  }
  console.log(activeWatch)
  res
    .status(200)
    .json(new apiResponse(200, activeWatch, "you have received the single watch infromation"));
});

const searchWatch= asyncHandler(async (req, res) => {
  const userText = req.params.userText;

  if (!userText || userText.trim() === "") {
    throw new ApiError(400, "Please provide a search query");
  }

  // Split user input into words
  const userWords = userText.trim().split(/\s+/);

  // Create regex for each word (case-insensitive)
  const regexes = userWords.map(word => new RegExp(word, "i"));

  // Search watches where at least one word matches in title, brand, category, or description
  const watches = await Watch.find({
    $or: [
      { title: { $in: regexes } },
      { brand: { $in: regexes } },
      { category: { $in: regexes } },
      { description: { $in: regexes } },
    ],
  });

  res.status(200).json(
    new apiResponse(200,{status: "success",
    results: watches.length,
    data: watches,},"success")
  );
});

const fetchWatchesByCategory= asyncHandler(async (req,res)=>{
  const { category, gender } = req.params; // destructure both params

  if (!category || !gender) {
    throw new ApiError(400, "Both category and gender parameters are required");
  }

  // Fetch watches matching both category and gender
  const watches = await Watch.find({ category, forWhom: gender });

  if (!watches || watches.length === 0) {
    return res.status(200).json({
      status: "success",
      data: [],
      message: `No watches found for category: ${category} and gender: ${gender}`,
    });
  }

  res.status(200).json({
    status: "success",
    data: watches,
    message: `Watches fetched for category: ${category} and gender: ${gender}`,
  });
})





/// below are actually the user controller ... they should heve been there (user wish list management)
const addWatchToWishList = asyncHandler(async (req, res) => {
  const watchId = req.params.watchid;

  const activeWatch = await Watch.findById(watchId);
  if (!activeWatch) {
    throw new ApiError(403, "Unauthorized -- watch is not in the database");
  }

  const activeUser = await User.findById(req.user._id); // ✅ use findById
  if (!activeUser) {
    throw new ApiError(404, "Unauthorized request to add to wishlist");
  }

  // Avoid duplicates
  if (!activeUser.wishlist.includes(watchId)) {
    activeUser.wishlist.push(watchId);
    await activeUser.save();
  }

  res
    .status(200)
    .json(new apiResponse(200, activeUser.wishlist, "Successfully added the watch to the wishlist"));
});

const removeWatchFromWishList = asyncHandler(async (req, res) => {
  const watchId = req.params.watchid;

  // check if watch exists
  const activeWatch = await Watch.findById(watchId);
  if (!activeWatch) {
    throw new ApiError(403, "Watch not found in the database");
  }

  // get the user
  const activeUser = await User.findById(req.user._id);
  if (!activeUser) {
    throw new ApiError(404, "User not found");
  }

  // remove watch if it exists
  let updatedUser = activeUser;
  if (activeUser.wishlist.includes(watchId)) {
    updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { wishlist: watchId } },
      { new: true }
    );
  }

  res.status(200).json(
    new apiResponse(
      200,
      { wishlist: updatedUser.wishlist }, // ✅ send only the wishlist array
      "Successfully removed the watch from the wishlist"
    )
  );
});

const getUserWishlist = async (req, res) => {
  try {
    const user_db = await User.findById(req.user._id);

    if (!user_db) {
      return res.status(404).json({ error: "User not found" });
    }

    const wishlist = await Watch.find({ _id: { $in: user_db.wishlist } })
      .select("title price description images discounted_price"); // ✅ only selected fields
    console.log(wishlist)


    res.status(200).json(new apiResponse(200, { wishlist }, "the wishlist is successfully received"));
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({ error: "Server error" });
  }
};


//user cart management

const addToUserCart = asyncHandler(async (req, res) => {
  if (!(req?.user?._id)) throw new ApiError(404, "unauthorized request .. user is not found")

  const watchId = req.params.watchid;
  const WatchInDb = await Watch.findById(watchId)
  if (!WatchInDb) throw new ApiError(405, "the watch is not in database")
  const db_user = await User.findById(req?.user?._id)
  if (!db_user) throw new ApiError(406, "the user is not in database")

  const existingItem = db_user.cart.find((item) => item.wid.toString() == watchId)
  if (existingItem) {
    // Increment quantity
    existingItem.qty += 1;
  } else {
    // Add new item
    db_user.cart.push({ wid: watchId, qty: 1 });
  }

  // Save changes
  await db_user.save();

  res.status(200).json({
    success: true,
    message: "Watch added to cart",
    cart: db_user.cart,
  });




})


const removeFromUserCart = asyncHandler(async (req, res) => {
  if (!(req?.user?._id)) throw new ApiError(404, "unauthorized request .. user is not found")

  const watchId = req.params.watchid;
  const WatchInDb = await Watch.findById(watchId)
  if (!WatchInDb) throw new ApiError(405, "the watch is not in database")
  const db_user = await User.findById(req?.user?._id)
  if (!db_user) throw new ApiError(406, "the user is not in database")

  const existingItem = db_user.cart.find(
    (item) => item.wid.toString() === watchId
  );

  if (!existingItem) {
    throw new ApiError(404, "This watch is not in the user's cart");
  }

  // If qty is 1 → remove the item completely
  if (existingItem.qty === 1) {
    db_user.cart = db_user.cart.filter(
      (item) => item.wid.toString() !== watchId
    );
  } else {
    // Otherwise decrement
    existingItem.qty -= 1;
  }

  await db_user.save();

  return res
    .status(200)
    .json(new apiResponse(200, db_user.cart, "Cart updated successfully"));
})

const getUserCart = asyncHandler(async (req, res) => {

  if (!(req?.user?._id)) {
    throw new ApiError(404, "Unauthorized request .. user not found");
  }

  const db_user = await User.findById(req.user._id).select("cart");
  if (!db_user) {
    throw new ApiError(406, "The user is not in database");
  }

  return res
    .status(200)
    .json(new apiResponse(200, db_user.cart, "User cart fetched successfully"));

})






export {
  addWatch, getAllWatches, addWatchToWishList, removeWatchFromWishList, getUserWishlist,
  singleWatchInformation, addToUserCart, removeFromUserCart, getUserCart, searchWatch, fetchWatchesByCategory
}
// controllers needed for

// adding the watches to database
// retreiving the watches from the database
// editing the information of the watches .. if entered wrong (title,price,brand,images etc)
// deleting the watches from the data base