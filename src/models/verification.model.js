import mongoose from "mongoose"
const verificationSchema= new mongoose.Schema({
    email:{
        type:String,
        required:true
    },
    otp:{
        type:String,
        required:true
    },
    expiry:{
        type:Date,
        required:true
    },
},{timestamps:true})
const Verification = mongoose.model("verification",verificationSchema)
export default Verification