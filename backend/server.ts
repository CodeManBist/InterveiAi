
import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

import app from "./app.ts";
import connectDB from "./db.ts";

const PORT = Number(process.env.PORT) || 3000;

// Configure Cloudinary
const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary environment variables");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  console.log("Cloudinary configured successfully");
};

// Start application
const startServer = async () => {
  try {
    // 1. Configure Cloudinary
    configureCloudinary();

    // 2. Connect MongoDB
    await connectDB();

    // 3. Start Express server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

void startServer();
