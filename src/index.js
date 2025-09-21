import dotenv from 'dotenv'
import dbConnect from './db/dbConnect.js'
import { app } from './app.js'
dotenv.config()
dbConnect()
    .then(() => {

        app.listen(process.env.PORT, () => { console.log("app is listening on ", process.env.PORT) })

    })
    .catch((err) => { console.log("error ", err) })






