import { Link, useNavigate } from "react-router-dom";
import { GitBranch } from "lucide-react";

import { AuthLayout } from "@/components/auth/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SignupPage() {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-semibold tracking-tight">
        Create your account
      </h1>

      <p className="mt-2 text-sm text-muted-foreground">
        Your first interview takes about fifteen minutes.
      </p>

      <form
        className="mt-8 space-y-4"
        onSubmit={handleSubmit}
      >
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>

          <Input
            id="name"
            placeholder="Alex Morgan"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>

          <Input
            id="email"
            type="email"
            placeholder="alex.morgan@hey.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>

          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
          />
        </div>

        <Button type="submit" className="w-full">
          Create account
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
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default SignupPage;