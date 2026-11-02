import { v2 as cloudinary } from "cloudinary";
import type { Request, Response } from "express";

import User from "../models/User.model.ts";
import { getCurrentUser } from "../middleware/auth.ts";

export const updateProfileImage = async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Profile image is required",
      });
    }

    const file = req.file;

    const result = await new Promise<{
      secure_url: string;
      public_id: string;
    }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "intervue/profile-images",
          resource_type: "image",
        },
        (error, uploadResult) => {
          if (error) {
            reject(error);
            return;
          }

          if (!uploadResult) {
            reject(new Error("Cloudinary upload failed"));
            return;
          }

          resolve({
            secure_url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
          });
        }
      );

      stream.end(file.buffer);
    });

    user.profileImage = result.secure_url;
    await user.save();

    return res.status(200).json({
      message: "Profile image updated successfully",
      profileImage: user.profileImage,
    });
  } catch (error) {
    console.error("PROFILE IMAGE UPDATE ERROR:", error);

    return res.status(500).json({
      message: "Failed to update profile image",
    });
  }
};

export const getCurrentUserProfile = async (req: Request, res: Response) => {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user: {
        clerkUserId: user.clerkUserId,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Failed to fetch current user:", error);

    return res.status(500).json({
      message: "Failed to fetch user",
    });
  }
};
