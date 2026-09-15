import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useApi } from "@/lib/useApi";

function SettingsPage() {
  const { isLoaded, user } = useUser();
  const api = useApi();

  const [profileImage, setProfileImage] = useState<string | null>(
    null,
  );

  const [selectedImage, setSelectedImage] = useState<File | null>(
    null,
  );

  const [previewUrl, setPreviewUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get("/api/users/me");
        setProfileImage(response.data.user.profileImage);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    }
    fetchUser();
  }, [api]);

  useEffect(() => {
    if (!selectedImage) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImage);

    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedImage]);

  if (!isLoaded) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-background">
          <div className="mx-auto max-w-[1100px] px-6 py-10 lg:px-10">
            <p className="text-sm text-muted-foreground">
              Loading settings...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-background">
          <div className="mx-auto max-w-[1100px] px-6 py-10 lg:px-10">
            <p className="text-sm text-muted-foreground">
              Please sign in to access settings.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const fullName =
    user.fullName ||
    `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
    "User";

  const username = user.username || "";

  const email =
    user.primaryEmailAddress?.emailAddress || "";

  const imageUrl = previewUrl || user.imageUrl;

  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    setSelectedImage(file);
  };

  const handleUpload = async () => {
    if (!selectedImage) return;
  
    try {
      const formData = new FormData();
  
      formData.append("image", selectedImage);
  
      const response = await api.patch(
        "/api/users/profile-image",
        formData,
      );
  
      console.log("Profile image updated:", response.data);
  
      setSelectedImage(null);
      setPreviewUrl(null);
  
      await user.reload();
    } catch (error) {
      console.error("Failed to upload profile image:", error);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-[1100px] px-6 py-10 lg:px-10">
          {/* Header */}
          <div>
            <p className="label-eyebrow">Settings</p>

            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">
              Settings
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Manage your profile information.
            </p>
          </div>

          <div className="mt-10 max-w-xl">
            {/* Profile Settings */}
            <section className="border-b border-border pb-8">
              <h2 className="text-[15px] font-medium">
                Profile
              </h2>

              <div className="mt-6 space-y-6">
                {/* Profile Image */}
                <div className="space-y-3">
                  <Label>Profile image</Label>

                  <div className="flex items-center gap-4">
                    <img
                      src={profileImage ? profileImage : imageUrl}
                      alt={fullName}
                      className="h-20 w-20 rounded-full border border-border object-cover"
                    />

                    <div>
                      <label
                        htmlFor="profile-image"
                        className="inline-flex cursor-pointer items-center rounded-md border border-border bg-background px-3 py-2 text-[13px] font-medium transition-colors hover:bg-secondary"
                      >
                        Choose image
                      </label>

                      <Input
                        id="profile-image"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleImageChange}
                      />

                      <p className="mt-2 text-[11px] text-muted-foreground">
                        JPG, PNG or WebP
                      </p>
                    </div>
                  </div>

                  {selectedImage && (
                    <Button
                      type="button"
                      onClick={handleUpload}
                    >
                      Upload image
                    </Button>
                  )}
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name
                  </Label>

                  <Input
                    id="name"
                    value={fullName}
                    disabled
                  />
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">
                    Username
                  </Label>

                  <Input
                    id="username"
                    value={username}
                    disabled
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email
                  </Label>

                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                  />
                </div>
              </div>
            </section>

            {/* Account Information */}
            <section className="pt-8">
              <h2 className="text-[15px] font-medium">
                Account
              </h2>

              <p className="mt-2 text-[13px] text-muted-foreground">
                Your authentication and account security are
                managed through Clerk.
              </p>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default SettingsPage;