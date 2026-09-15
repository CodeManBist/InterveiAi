import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { useUser } from "@clerk/react";

import { Logo } from "@/components/brand/logo";
import { DashboardNavigation } from "./DashboardNavigation";

import { useApi } from "@/lib/useApi";

export function Sidebar() {
  const { isLoaded, user } = useUser();
  const api = useApi();

  const [profileImage, setProfileImage] = useState<string | null>(null);

  const fullName =
    user?.fullName ||
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    "User";

  const email =
    user?.primaryEmailAddress?.emailAddress || "";

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

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col justify-between border-r border-border bg-card px-4 py-5 lg:flex">
      <div>
        <Link
          to="/"
          className="flex items-center px-1 pb-6"
        >
          <Logo />
        </Link>

        <DashboardNavigation />
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex items-center gap-3 px-1">
          {isLoaded && user ? (
            <img
            src={profileImage || user.imageUrl}
            alt={fullName}
            className="h-8 w-8 rounded-md object-cover"
          />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-mono text-[11px] text-primary-foreground">
              U
            </span>
          )}

          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">
              {fullName}
            </p>

            <p className="truncate font-mono text-[10px] text-muted-foreground">
              {email}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-0.5">
          <Link
            to="/profile"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <User className="h-4 w-4" />
            Profile
          </Link>

          <Link
            to="/settings"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>

          <Link
            to="/login"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Link>
        </div>
      </div>
    </aside>
  );
}