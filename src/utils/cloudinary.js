import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'
import dotenv from 'dotenv'
dotenv.config()
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET

})

const uploadOnCloudinary=async (localfilepath)=>{
    try {
        if(!localfilepath) return null
        // upload the file on cloudinary
        const response =await cloudinary.uploader.upload(localfilepath,{resource_type:"auto"})
        //file has been uploaded successfully
        await fs.promises.unlink(localfilepath)
        return response.url
        
    } catch (error) {

        await fs.promises.unlink(localfilepath)
        return null;
        
    }
}

export {uploadOnCloudinary}