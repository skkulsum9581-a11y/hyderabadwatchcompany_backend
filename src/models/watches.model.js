import mongoose from 'mongoose'
const watchSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true,
        trim:true,
        unique:true
    },
    discounted_price:{
        type:Number,
        required:true,
        

    }
    ,
    price:{
        type:Number,
        required:true,
    },
   
      description:{
        type:String,
        required:true
    },
    brand:{
        type:String,
        required:true
    },
    category:{
        type:String,
        required:true

    },
    forWhom:{
        type:String,                       // for male or female  .. ( only two options available )
        required:true
    },
    images:{
        type:[String],// array of images url
        validate:[arr=>arr.length<=4,"max 4 images are allowed"]
    },
    video:{
        type:String,//video link
        required:true
    },
    rating_avg:{
        type:Number,
        default:0,
        min:0,
        max:5,
    },

},{timestamps:true})

export const Watch= mongoose.model("Watch",watchSchema)
