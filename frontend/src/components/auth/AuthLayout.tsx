import { Link } from "react-router-dom";

import { Logo } from "@/components/brand/logo";
import { DashboardPreview } from "@/components/landing/DashboardPreview";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left side */}
      <div className="hidden flex-col justify-between border-r border-border bg-card p-12 lg:flex">
        <Link to="/" className="flex items-center">
          <Logo />
        </Link>

        <div className="max-w-md">
          <DashboardPreview />

          <p className="mt-8 text-[22px] leading-snug font-medium tracking-[-0.02em]">
            Build{" "}
            <span className="serif-accent text-primary">
              confidence
            </span>{" "}
            before the real interview.
          </p>
        </div>

        <p className="font-mono text-[11px] text-muted-foreground">
          © 2026 Intervue Labs
        </p>
      </div>

      {/* Right side */}
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link to="/" className="mb-10 inline-flex lg:hidden">
            <Logo />
          </Link>

          {children}
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;