import { Link, useLocation, useNavigate } from "react-router-dom";
import { User, Settings, LogOut, ChevronDown, LogIn } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

function initialsFromUser(
  email: string | undefined,
  metadata?: Record<string, unknown>,
) {
  const fullName = typeof metadata?.full_name === "string" ? metadata.full_name : undefined;
  const name = fullName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "U";
}

export function TopNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-full items-center justify-between px-6">
        {/* Logo */}
        <Link 
          to="/" 
          className="flex items-center gap-2.5 transition-smooth hover:opacity-80"
        >
          <img
            src="/favicon.ico"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-lg object-contain"
            decoding="async"
          />
          <span className="text-lg font-semibold tracking-tight text-foreground">
            UniSync
          </span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto px-1 sm:gap-1">
          <Link to="/chat">
            <Button
              variant={location.pathname === "/chat" ? "secondary" : "ghost"}
              size="sm"
              className="text-sm"
            >
              Chat
            </Button>
          </Link>
          <Link to="/schedule">
            <Button
              variant={location.pathname === "/schedule" ? "secondary" : "ghost"}
              size="sm"
              className="text-sm"
            >
              Schedule
            </Button>
          </Link>
          <Link to="/integrations">
            <Button
              variant={location.pathname === "/integrations" ? "secondary" : "ghost"}
              size="sm"
              className="text-sm"
            >
              Integrations
            </Button>
          </Link>
        </nav>

        {/* User menu or sign in */}
        {loading ? (
          <div className="h-9 w-24 animate-pulse rounded-md bg-muted" aria-hidden />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-2 hover:bg-secondary"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : ""}
                    alt=""
                  />
                  <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                    {initialsFromUser(user.email, user.user_metadata)}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
                {user.email}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" disabled>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  void handleLogout();
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="default" size="sm" asChild>
            <Link to="/login" className="gap-2">
              <LogIn className="h-4 w-4" />
              Sign in
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
