import mongoose from "mongoose";

const connectDB = async (DATABASE_URL) => {
    try {
        const DB_OPTIONS = {
            dbName : "Buying"
        }
        await mongoose.connect(DATABASE_URL, DB_OPTIONS);
        console.log("Connected to database..."); //remove this for production
    } catch (error) {
        console.log(`Error: ${error}`); //remove this for production
    }
}

export default connectDB;