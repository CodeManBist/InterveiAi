import { verifyWebhook } from "@clerk/express/webhooks";
import type { Request, Response } from "express";

import User from "../models/User.model.ts";

export const handleClerkWebhook = async (req: Request, res: Response) => {
  try {
    const evt = await verifyWebhook(req);

    console.log("Clerk webhook received:", evt.type);

    if (evt.type === "user.created") {
      const {
        id,
        username,
        first_name,
        last_name,
        image_url,
        email_addresses,
        primary_email_address_id,
      } = evt.data;

      const primaryEmail = email_addresses.find(
        (email) => email.id === primary_email_address_id
      );

      if (!primaryEmail) {
        return res.status(400).json({
          message: "Primary email not found",
        });
      }

      await User.create({
        clerkUserId: id,
        username: username || primaryEmail.email_address,
        email: primaryEmail.email_address,
        ...(first_name ? { firstName: first_name } : {}),
        ...(last_name ? { lastName: last_name } : {}),
        ...(image_url ? { profileImage: image_url } : {}),
      });

      console.log("User created in MongoDB:", id);
    }

    if (evt.type === "user.updated") {
      const {
        id,
        username,
        first_name,
        last_name,
        image_url,
        email_addresses,
        primary_email_address_id,
      } = evt.data;

      const primaryEmail = email_addresses.find(
        (email) => email.id === primary_email_address_id
      );

      await User.findOneAndUpdate(
        { clerkUserId: id },
        {
          ...(username ? { username } : {}),
          ...(primaryEmail?.email_address
            ? { email: primaryEmail.email_address }
            : {}),
          ...(first_name ? { firstName: first_name } : {}),
          ...(last_name ? { lastName: last_name } : {}),
          ...(image_url ? { profileImage: image_url } : {}),
        },
        { new: true }
      );

      console.log("User updated in MongoDB:", id);
    }

    if (evt.type === "user.deleted") {
      const clerkUserId = evt.data.id;

      if (!clerkUserId) {
        return res.status(400).json({
          message: "Clerk user ID is missing",
        });
      }

      await User.findOneAndDelete({
        clerkUserId,
      });

      console.log("User deleted from MongoDB:", clerkUserId);
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("Clerk webhook error:", error);

    return res.status(400).json({
      message: "Webhook verification failed",
    });
  }
};
