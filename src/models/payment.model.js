import mongoose from 'mongoose'
const paymentSchema= new mongoose.Schema({
    user_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    payment_screenshot:{
        type:String,                                            // link of image of the payment screenshot stored on cloudnary
        required:true,
    },
    amount:{
        type:String,
        required:true

    },
   payment_cart: [{
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
       }]
},{timestamps:true})
export const Payment = mongoose.model("Payment",paymentSchema)