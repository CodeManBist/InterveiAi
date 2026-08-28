import dotenv from "dotenv";
import express from "express";
import connectDB from "./db.ts";

dotenv.config();

const app = express();

app.use(express.json());

connectDB();

app.get("/test", (req, res) => {
    res.json({
        message: "Test route working!"
    })
})


const PORT = process.env.PORT;
app.listen(3000, () => {
    console.log(`server running on http://localhost:${PORT}`);
})
