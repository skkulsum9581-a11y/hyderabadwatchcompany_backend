const asyncHandler= (requestHandler)=>{
    return (req,res,next)=>{
        Promise.resolve(requestHandler(req,res,next)).
        catch((error)=>next(error))
    }
}

export {asyncHandler}


// const asynchandler = ()=>{}
    // const asynchandler = (fn)=>{()=>{}}
         // const asynchandler = (fn)=>{async()=>{}}

             // const asynchandler = (fn)=>async ()=>{}






                /// with try catch .. asyncHandler


// const asyncHandlerr=(fn)=>async (req,res,next)=>{
//     try {
//         await fn(req,res,next)
        
//     } catch (error) {
//         res.status(error.code || 500 ).json({successs:false, message:error.message})
//     }
// }