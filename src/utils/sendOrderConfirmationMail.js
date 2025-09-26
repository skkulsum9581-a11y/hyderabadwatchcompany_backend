import Mailgun from "mailgun.js";
import formData from "form-data";
import { Watch } from "../models/watches.model.js";

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY,
});

// functions to get the title and price of the watch

const watchPrice=async (id)=>{
    const watch= await Watch.findById(id)
    return watch?.discounted_price
       
}

const watchName=async (id)=>{
    const watch= await Watch.findById(id)
    return watch?.title
       
}


/**
 * Send order confirmation email
 * @param {string} to - recipient email
 * @param {Object} order - order details
 */
export const sendOrderConfirmationEmail = async (to, order) => {
  try {
    const { name, amount, payment_cart, payment_screenshot } = order;

    // Build cart items as HTML
   // build HTML for cart items
const cartHtml = (
  await Promise.all(
    payment_cart.map(async (item, idx) => {
      const name = await watchName(item.wid);
      const price = await watchPrice(item.wid);
      return `<li>
        Item ${idx + 1}: <b>${name}</b> | Qty: ${item.qty} | Price: ₹${Number(price).toLocaleString("en-IN")}
      </li>`;
    })
  )
).join("");


    const message = {
      from: `HyderabadWatchCompany <${process.env.MAILGUN_FROM}>`,
      to,
      subject: "Order Confirmation - Hyderabad Watch Company",
      html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color:#f9f9f9; padding:20px; }
          .container { max-width:600px; margin:auto; background:white; padding:30px; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
          .header { text-align:center; }
          .order-details { margin-top:20px; }
          .footer { font-size:12px; color:#999; text-align:center; margin-top:30px; }
          .screenshot { margin-top:20px; text-align:center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Hyderabad Watch Company</h2>
            <h3>Order Confirmation</h3>
          </div>

          <p>Hi! <b>${name}</b>,</p>
          <p>Thank you for your order! below are your order and payment details, that has to be confirmed yet..
          and once confirmed we will notify you through email,whatsapp, or call:</p>

          <div class="order-details">
            <p><b>Total Amount:</b> ₹${Number(amount).toLocaleString("en-IN")}</p>
            <ul>
              ${cartHtml}
            </ul>
          </div>

          <div class="screenshot">
            <p>Payment Screenshot:</p>
            <img src="${payment_screenshot}" alt="Payment Screenshot" width="250" style="border-radius:8px;">
          </div>

          <div class="footer">
            &copy; ${new Date().getFullYear()} Hyderabad Watch Company. All rights reserved.
          </div>
        </div>
      </body>
      </html>
      `,
    };

    const response = await mg.messages.create(process.env.MAILGUN_DOMAIN, message);

    console.log("✅ Order Confirmation Email sent:", response);
    return response;
  } catch (error) {
    console.error("❌ Error sending Order Confirmation Email:", error);
    throw error;
  }
};
