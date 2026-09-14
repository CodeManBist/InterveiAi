import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { candidate } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

const sections = [
  "Profile",
  "Account",
  "Interview Preferences",
  "Notifications",
  "Security",
] as const;

type Section = (typeof sections)[number];

function Row({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="border-b border-border py-8 first:pt-0 last:border-0">
      <h2 className="text-[15px] font-medium">{title}</h2>

      <div className="mt-5 max-w-xl space-y-5">
        {children}
      </div>
    </section>
  );
}

function ProfilePage() {
  const [active, setActive] = useState<Section>("Profile");

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
            Manage your account and interview defaults.
          </p>
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[200px_minmax(0,1fr)]">
          {/* Sidebar */}
          <nav className="flex gap-1 overflow-x-auto lg:flex-col">
            {sections.map((section) => (
              <button
                key={section}
                onClick={() => setActive(section)}
                className={cn(
                  "shrink-0 rounded-md px-3 py-2 text-left text-[13px] transition-colors",
                  active === section
                    ? "bg-secondary font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {section}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div>
            {/* ================================
                PROFILE
            ================================= */}
            {active === "Profile" && (
              <Row title="Profile">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>

                  <Input
                    id="name"
                    defaultValue={candidate.name}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>

                  <Input
                    id="email"
                    defaultValue={candidate.email}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gh">
                    GitHub username
                  </Label>

                  <Input
                    id="gh"
                    defaultValue={candidate.github}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>

                  <Textarea
                    id="bio"
                    rows={4}
                    defaultValue={candidate.bio}
                  />
                </div>

                <Button>
                  Save changes
                </Button>
              </Row>
            )}

            {/* ================================
                ACCOUNT
            ================================= */}
            {active === "Account" && (
              <Row title="Account">
                <div className="space-y-2">
                  <Label htmlFor="current">
                    Change password
                  </Label>

                  <Input
                    id="current"
                    type="password"
                    placeholder="Current password"
                  />

                  <Input
                    type="password"
                    placeholder="New password"
                  />
                </div>

                <Button>
                  Update password
                </Button>

                <div className="hairline pt-6">
                  <p className="text-[13px] font-medium">
                    Delete account
                  </p>

                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Permanently removes your interviews and
                    reports. This cannot be undone.
                  </p>

                  <Button
                    variant="destructive"
                    className="mt-4"
                  >
                    Delete Account
                  </Button>
                </div>
              </Row>
            )}

            {/* ================================
                INTERVIEW PREFERENCES
            ================================= */}
            {active === "Interview Preferences" && (
              <Row title="Interview Preferences">
                {[
                  [
                    "Default Role",
                    [
                      "Full Stack Developer",
                      "Frontend Engineer",
                      "Backend Engineer",
                    ],
                  ],
                  [
                    "Experience",
                    [
                      "Junior (0–2 yrs)",
                      "Mid (3–5 yrs)",
                      "Senior (6+ yrs)",
                    ],
                  ],
                  [
                    "Difficulty",
                    [
                      "Gentle",
                      "Moderate",
                      "Demanding",
                    ],
                  ],
                  [
                    "Interview Mode",
                    ["Voice", "Text"],
                  ],
                ].map(([label, options]) => (
                  <div
                    key={label as string}
                    className="space-y-2"
                  >
                    <Label>
                      {label as string}
                    </Label>

                    <Select
                      defaultValue={
                        (options as string[])[0]
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {(options as string[]).map(
                          (option) => (
                            <SelectItem
                              key={option}
                              value={option}
                            >
                              {option}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                ))}

                <Button>
                  Save preferences
                </Button>
              </Row>
            )}

            {/* ================================
                NOTIFICATIONS
            ================================= */}
            {active === "Notifications" && (
              <Row title="Notifications">
                {[
                  [
                    "Weekly progress summary",
                    true,
                  ],
                  [
                    "New question packs",
                    false,
                  ],
                  [
                    "Reminders to practice",
                    true,
                  ],
                ].map(([label, on]) => (
                  <div
                    key={label as string}
                    className="flex items-center justify-between border-b border-border pb-4 last:border-0"
                  >
                    <span className="text-[13px]">
                      {label as string}
                    </span>

                    <Switch
                      defaultChecked={
                        on as boolean
                      }
                    />
                  </div>
                ))}
              </Row>
            )}

            {/* ================================
                SECURITY
            ================================= */}
            {active === "Security" && (
              <Row title="Security">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <p className="text-[13px]">
                      Two-factor authentication
                    </p>

                    <p className="mt-1 text-[13px] text-muted-foreground">
                      Require a code from your authenticator
                      app.
                    </p>
                  </div>

                  <Switch />
                </div>

                <div>
                  <p className="text-[13px]">
                    Active sessions
                  </p>

                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    macOS · Chrome · San Francisco · current
                  </p>
                </div>

                <Button variant="outline">
                  Sign out of all devices
                </Button>
              </Row>
            )}
          </div>
        </div>
      </div>
    </div>
    </DashboardLayout>
  );
}

export default ProfilePage;