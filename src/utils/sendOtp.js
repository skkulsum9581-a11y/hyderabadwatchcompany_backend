    import nodemailer from "nodemailer";
    import dotenv from "dotenv";
    dotenv.config({path:"../../.env"});

    export const sendOTPEmail = async (to, otp) => {
    try {
        const transporter = nodemailer.createTransport({
        service: "gmail", // replace with SendGrid/Mailgun later
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS, // Gmail App Password
        },
        });

        const htmlTemplate = `
        <!DOCTYPE html>
        <html>
            <head>
            <style>
                body { font-family: Arial, sans-serif; background-color:#f9f9f9; padding:20px; }
                .container { max-width:600px; margin:auto; background:white; padding:30px; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,0.1); }
                .header { text-align:center; }
                .otp { font-size:32px; font-weight:bold; color:#2c3e50; margin:20px 0; }
                .footer { font-size:12px; color:#999; text-align:center; margin-top:30px; }
            </style>
            </head>
            <body>
            <div class="container">
                <div class="header">
                <h2>Hyderabad Watch Company</h2>
                <p>Your One-Time Password (OTP)</p>
                </div>
                <div class="otp">${otp}</div>
                <p>This OTP will expire in <b>5 minutes</b>. Do not share it with anyone.</p>
                <div class="footer">
                &copy; ${new Date().getFullYear()} Hyderabad Watch Company. All rights reserved.
                </div>
            </div>
            </body>
        </html>
        `;

        const mailOptions = {
        from: `"Hyderabad Watch Company" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Your OTP Code",
        html: htmlTemplate,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("✅ OTP Email sent:", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ Error sending OTP Email:", error);
        throw error;
    }
    };

    