import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, type Location } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const signUpSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

type SignInValues = z.infer<typeof signInSchema>;
type SignUpValues = z.infer<typeof signUpSchema>;

/** Supabase caps auth emails/hour on hosted projects; surface actionable help. */
function toastAuthError(err: Error) {
  const m = err.message.toLowerCase();
  if (m.includes("rate limit") || m.includes("email rate")) {
    toast.error(
      "Supabase is temporarily blocking more auth emails (hourly limit). Wait a bit and retry, or in the Supabase dashboard go to Authentication → Providers → Email and disable “Confirm email” while you develop so sign-up does not send mail.",
      { duration: 14_000 },
    );
    return;
  }
  toast.error(err.message);
}

export default function Auth() {
  const { signIn, signUp, user, loading, supabaseReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: Location } | null)?.from?.pathname ?? "/chat";
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    if (!loading && user && supabaseReady) {
      navigate(redirectTo, { replace: true });
    }
  }, [loading, user, navigate, redirectTo, supabaseReady]);

  const signInForm = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!supabaseReady) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 pt-20 pb-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Configure Supabase</CardTitle>
            <CardDescription>
              Add <code className="rounded bg-muted px-1 py-0.5 text-xs">VITE_SUPABASE_URL</code> and{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">VITE_SUPABASE_ANON_KEY</code> to{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code> in this app (see{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.example</code>), then restart the dev server.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/">Back to home</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const onSignIn = signInForm.handleSubmit(async (values) => {
    const { error } = await signIn(values.email, values.password);
    if (error) {
      toastAuthError(error);
      return;
    }
    toast.success("Signed in");
    navigate(redirectTo, { replace: true });
  });

  const onSignUp = signUpForm.handleSubmit(async (values) => {
    const { error } = await signUp(values.email, values.password, values.fullName?.trim() || undefined);
    if (error) {
      toastAuthError(error);
      return;
    }
    toast.success("Check your email to confirm your account, or sign in if confirmation is disabled.");
    setTab("signin");
    signUpForm.reset();
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 pt-20 pb-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Welcome to UniSync</CardTitle>
          <CardDescription>Sign in with your Supabase account to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="space-y-4 pt-4">
              <form onSubmit={onSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    {...signInForm.register("email")}
                  />
                  {signInForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{signInForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    autoComplete="current-password"
                    {...signInForm.register("password")}
                  />
                  {signInForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{signInForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={signInForm.formState.isSubmitting}>
                  {signInForm.formState.isSubmitting ? "Signing in..." : "Sign in"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="space-y-4 pt-4">
              <form onSubmit={onSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Name (optional)</Label>
                  <Input id="signup-name" autoComplete="name" {...signUpForm.register("fullName")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    {...signUpForm.register("email")}
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-sm text-destructive">{signUpForm.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    {...signUpForm.register("password")}
                  />
                  {signUpForm.formState.errors.password && (
                    <p className="text-sm text-destructive">{signUpForm.formState.errors.password.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={signUpForm.formState.isSubmitting}>
                  {signUpForm.formState.isSubmitting ? "Creating account..." : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 border-t pt-4">
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/" className="text-primary underline-offset-4 hover:underline">
              Back to home
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
