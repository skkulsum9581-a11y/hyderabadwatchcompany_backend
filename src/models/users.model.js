import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config()

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index:true
    },
    name:{
        type:String,
        required:true,
        trim:true
    },
    password: {
        type: String,
        required: true,
    },
    avatar: {
        type: String,
        default: "",
    },
    phone_no: {
        type: String,
        default: "",
    },
    address: {
        type: String,
        default: ""
    },
    verified:{
        type:Boolean,
        default:false
    }
    ,
    refreshToken:{
        type:String,
        default:""
    },
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Watch",
        
    }],
    cart: [{
        wid: {
            type:mongoose.Schema.Types.ObjectId,
            ref:"Watch",
            required:true,
        },
        qty: {
            type:Number,
            default:1,
            min:1,
        }
    }],
    viewed: [
        {
            wid: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Watch",

            },

        }
    ],
    purchases: [{
        wid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Watch",
        },
        date: {
            type: Date,
            default: Date.now,
        }
    }]

}, { timestamps: true })

// methods for password handling

//hash password before saving
userSchema.pre("save",async function(next){
    if(!this.isModified("password")) return next();
    this.password= await bcrypt.hash(this.password,10)
    next()
})

//compare entered password with hashed password
userSchema.methods.comparePassword= async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword,this.password)    
}

userSchema.methods.generateAccessToken= async function(){
    return await jwt.sign({
        _id:this._id,
        email:this.email,
        name:this.name
    },process.env.ACCESS_TOKEN_SECRET,{expiresIn: process.env.ACCESS_TOKEN_EXPIRY})
}
userSchema.methods.generateRefreshToken=  function(){
   return  jwt.sign({
        _id:this._id,
    },process.env.REFRESH_TOKEN_SECRET,{expiresIn: process.env.REFRESH_TOKEN_EXPIRY})
}

export const User = mongoose.model("User", userSchema)