import { useState ,useEffect } from "react";
import { useUser } from "@clerk/react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useApi } from "@/lib/useApi";


function ProfilePage() {
  const { isLoaded, user } = useUser();
  const api = useApi();

  const [profileImage, setProfileImage] = useState<string | null>(null);

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
  })

  if (!isLoaded) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-background">
          <div className="mx-auto max-w-[1100px] px-6 py-10 lg:px-10">
            <p className="text-sm text-muted-foreground">
              Loading profile...
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
              Please sign in to view your profile.
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

  const username = user.username || "Not set";

  const email =
    user.primaryEmailAddress?.emailAddress || "Not available";

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-[1100px] px-6 py-10 lg:px-10">
          {/* Header */}
          <div>
            <p className="label-eyebrow">Profile</p>

            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">
              {fullName}
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Your profile and account information.
            </p>
          </div>

          {/* Profile Card */}
          <div className="mt-10 max-w-xl">
            <section className="border-b border-border pb-8">
              <h2 className="text-[15px] font-medium">
                Profile
              </h2>

              <div className="mt-6 space-y-6">
                {/* Profile Image */}
                <div className="flex items-center gap-4">
                  <img
                    src={profileImage ? profileImage : user.imageUrl}
                    alt={fullName}
                    className="h-20 w-20 rounded-full border border-border object-cover"
                  />

                  <div>
                    <p className="text-[13px] font-medium">
                      {fullName}
                    </p>

                    <p className="mt-1 text-[12px] text-muted-foreground">
                      @{username}
                    </p>
                  </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <p className="text-[12px] text-muted-foreground">
                    Name
                  </p>

                  <p className="text-[14px]">
                    {fullName}
                  </p>
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <p className="text-[12px] text-muted-foreground">
                    Username
                  </p>

                  <p className="text-[14px]">
                    @{username}
                  </p>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <p className="text-[12px] text-muted-foreground">
                    Email
                  </p>

                  <p className="text-[14px]">
                    {email}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ProfilePage;