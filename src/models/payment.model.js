import mongoose from 'mongoose'
import { Watch } from './watches.model.js';
import axios from 'axios'
import dotenv from 'dotenv'
import { sendOrderConfirmationEmail } from '../utils/sendOrderConfirmationMail.js';
dotenv.config({path:"../../.env"})
const paymentSchema= new mongoose.Schema({
    user_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    name:{
        type:String,
        required:true
    }
    ,
    email:{
        type:String,
        required:true,
        lowercase:true,
        index:true

    },
    payment_screenshot:{
        type:String,                                            // link of image of the payment screenshot stored on cloudnary
        required:true,
    },
    amount:{
        type:String,
        required:true

    },
    address:{
        type:String,
        required:true,
        trim:true,
    },
    phone:{
        type:String,
        required:true
    }
    ,
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


const watchPrice=async (id)=>{
    const watch= await Watch.findById(id)
    return watch?.discounted_price
       
}

const watchName=async (id)=>{
    const watch= await Watch.findById(id)
    return watch?.title
       
}

// pre hook to notify myself before saving the entry in the database
paymentSchema.pre("save", async function (next) {
  try {
    const payment = this;

    // Resolve cart items
    const cartItemsStrings = await Promise.all(
      payment.payment_cart.map(async (item) => {
        const name = await watchName(item.wid);
        const price = await watchPrice(item.wid);
        return `
 Watch-Name: ${name},
 Price: ₹${Number(price).toLocaleString("en-IN")}, 
 Qty: ${item.qty}`;
      })
    );

    const caption = `
New Payment Made:

Customer Name: ${payment.name}
Email: ${payment.email}

Amount: ₹${Number(payment.amount).toLocaleString("en-IN")}

Phone: ${payment.phone}
Address: ${payment.address}

Cart Items:
 ${cartItemsStrings.join("; ")}
`;

    const BOT_TOKEN = process.env.TELEGRAM_BOT_ID;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    // Send the screenshot as a photo
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      chat_id: CHAT_ID,
      photo: payment.payment_screenshot,
      caption: caption,
    });
    const order={
        name:payment.name,
        amount:payment.amount,
        payment_cart:payment.payment_cart,
        payment_screenshot:payment.payment_screenshot
    }

    console.log(order)
    await sendOrderConfirmationEmail(payment.email,order)

    next(); // continue saving
  } catch (err) {
    console.error("Error notifying before save:", err);
    next(err); // optionally block saving if notification fails
  }
});




export const Payment = mongoose.model("Payment",paymentSchema)