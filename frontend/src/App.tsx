import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";
import XRayAnnotation from "./pages/XRayAnnotation";
import { XRayScanner } from "./components/xray/XRayScanner";
import { Moon, Sun } from "lucide-react";

const queryClient = new QueryClient();

const HomePage = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 pt-12 pb-4 bg-background/80 backdrop-blur-md border-b border-border/10">
        <div className="flex items-center">
          <img src="/Logo.jpg" alt="Logo" className="w-8 h-8 rounded-md shadow-sm" />
          <span className="text-xl font-black ml-3 tracking-tight text-foreground">SpinoAid</span>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-2xl bg-secondary text-secondary-foreground shadow-sm active:scale-95 transition-all"
        >
          {theme === "light" ? <Moon size={20} className="text-primary" /> : <Sun size={20} className="text-yellow-400" />}
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm flex flex-col items-center animate-in fade-in zoom-in duration-1000">
          <XRayScanner />
        </div>
      </div>
    </div>
  );
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/xray-annotation" element={<XRayAnnotation />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
