import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface NavbarProps {
  onLogout?: () => void;
}

export function Navbar({ onLogout }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    onLogout?.();
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden transition-transform">
            <img src="/Logo.jpg" alt="SpinoAid Logo" className="h-full w-full object-contain" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">SpinoAid</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-muted transition-colors duration-200",
              "focus-ring"
            )}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          <button
            onClick={handleLogout}
            className={cn(
              "flex h-10 items-center gap-2 rounded-lg px-3",
              "text-muted-foreground hover:text-foreground",
              "hover:bg-muted transition-colors duration-200",
              "focus-ring"
            )}
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden sm:inline text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
