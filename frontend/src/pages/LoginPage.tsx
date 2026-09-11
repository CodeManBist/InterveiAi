import { Link, useNavigate } from "react-router-dom";
import { GitBranch } from "lucide-react";

import { AuthLayout } from "../components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function LoginPage() {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome back
      </h1>

      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to continue your practice.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>

          <Input
            id="email"
            type="email"
            placeholder="alex.morgan@hey.com"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>

            <span className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              Forgot password
            </span>
          </div>

          <Input
            id="password"
            type="password"
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>

      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-border" />

        <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          or
        </span>

        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={() => navigate("/dashboard")}
      >
        <GitBranch className="h-4 w-4" />
        Continue with GitHub
      </Button>

      <p className="mt-8 text-sm text-muted-foreground">
        New here?{" "}
        <Link
          to="/signup"
          className="font-medium text-primary hover:underline"
        >
          Create account
        </Link>
      </p>
    </AuthLayout>
  );
}

export default LoginPage;