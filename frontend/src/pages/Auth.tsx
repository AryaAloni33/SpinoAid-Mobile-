import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react";
import { MedicalButton } from "@/components/medical/MedicalButton";
import { MedicalInput } from "@/components/medical/MedicalInput";
import { MedicalCard } from "@/components/medical/MedicalCard";
import { useTheme } from "@/components/ThemeProvider";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

type AuthMode = "login" | "register";

interface FormErrors {
  email?: string;
  password?: string;
  name?: string;
  confirmPassword?: string;
}

export default function Auth() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (mode === "register") {
      if (!formData.name) newErrors.name = "Full name is required";
      if (formData.password !== formData.confirmPassword)
        newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (mode === "login") {
        await login(formData.email, formData.password);
      } else {
        await register(formData.name, formData.email, formData.password);
      }
      navigate("/dashboard");
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Something went wrong";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const switchMode = () => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setErrors({});
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <button
        onClick={toggleTheme}
        className={cn(
          "fixed top-4 right-4 flex h-10 w-10 items-center justify-center rounded-lg",
          "text-muted-foreground hover:text-foreground",
          "hover:bg-muted transition-colors duration-200",
          "focus-ring"
        )}
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </button>

      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden mb-4 transition-transform duration-300">
            <img src="/Logo.jpg" alt="SpinoAid Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">SpinoAid</h1>
          <p className="text-muted-foreground mt-2 font-medium">Advanced Spine Analysis & Annotation</p>
        </div>

        <MedicalCard variant="elevated" padding="lg" className="animate-fade-in">
          <div className="flex rounded-lg bg-muted p-1 mb-6">
            <button
              onClick={() => setMode("login")}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200",
                mode === "login"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("register")}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200",
                mode === "register"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <MedicalInput
                label="Full Name"
                placeholder="Dr. John Smith"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                error={errors.name}
                leftIcon={<User className="h-4 w-4" />}
              />
            )}
            <MedicalInput
              label="Email Address"
              type="email"
              placeholder="doctor@hospital.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              error={errors.email}
              leftIcon={<Mail className="h-4 w-4" />}
            />
            <MedicalInput
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              error={errors.password}
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            {mode === "register" && (
              <MedicalInput
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                error={errors.confirmPassword}
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="hover:text-foreground transition-colors">
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            )}
            {mode === "login" && (
              <div className="flex justify-end">
                <button type="button" className="text-sm text-primary hover:text-primary/80 transition-colors">
                  Forgot password?
                </button>
              </div>
            )}
            <MedicalButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-6"
              isLoading={isLoading}
              rightIcon={!isLoading && <ArrowRight className="h-4 w-4" />}
            >
              {mode === "login" ? "Sign In" : "Create Account"}
            </MedicalButton>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button onClick={switchMode} className="text-primary font-medium hover:text-primary/80 transition-colors">
              {mode === "login" ? "Register" : "Sign In"}
            </button>
          </p>
        </MedicalCard>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
