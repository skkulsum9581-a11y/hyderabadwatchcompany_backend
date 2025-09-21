import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  wid: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Watch",
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  text: {
    type: String,
    trim: true,
    maxlength: 1000, // lowercase
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    
  },
  images: {
    type: [String], // array of image URLs
    validate: {
      validator: function(arr) {
        return arr.length <= 4;
      },
      message: "Maximum 4 images are allowed"
    }
  },
  video: {
    type: String,// single video link
    default:""
  }
}, { timestamps: true });

export const Review = mongoose.model("Review", reviewSchema);
