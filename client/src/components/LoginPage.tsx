import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // State hooks
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevents the browser from refreshing the page on form submission
    setError(null);

    if (!email.trim() || !password) {
      setError("Enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with your actual backend URL
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "An error occurred.");
      }

      await login(data.token); // save auth state client side
      navigate("/"); // Redirect to home page after successful login
    } catch (err: any) {
      // TODO: Handle specific error cases
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px-240px)] max-w-[1440px] mx-auto px-container-padding py-12 md:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-stretch">
        {/* Left Column: Branding */}
        <div className="lg:col-span-5 hidden lg:flex flex-col justify-between p-8 bg-surface-container-low border-hairline rounded-xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary leading-tight mb-4">
              Welcome back to <b>Nibash</b>
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
              {/* // TODO: Replace with actual branding message */}
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Porro
              sequi aut tempore laboriosam, delectus nemo expedita ducimus eaque
              impedit nulla.
            </p>
          </div>

          {/* Stats */}
          <div className="relative z-10 pt-6 mt-12 grid grid-cols-2 gap-4">
            <div>
              {/* // TODO: Find the number by querying */}
              <span className="block font-display-lg text-2xl text-primary font-light">
                1k+
              </span>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                Verified listings
              </span>
            </div>
            <div>
              <span className="block font-display-lg text-2xl text-primary font-light">
                25+
              </span>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
                Areas covered
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Login Form */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <div className="bg-surface-container-lowest border-hairline rounded-xl p-8 md:p-10 max-w-xl mx-auto w-full">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <h1 className="font-headline-md text-headline-md font-bold text-primary mt-2">
                  Login to Your Account
                </h1>
              </div>
            </div>

            {/* Error Alerts */}
            {error && (
              <div className="mb-6 p-4 bg-error-container/40 border border-error/30 rounded-lg flex items-center gap-3 text-on-error-container">
                <span className="material-symbols-outlined text-error text-xl shrink-0 mt-0.5">
                  error
                </span>
                <div className="font-body-md text-sm">{error}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="font-label-sm text-label-sm uppercase tracking-widest text-primary"
                  htmlFor="login-email"
                >
                  Email Address
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                    mail
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg py-3.5 pl-11 pr-4 text-sm font-medium focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label
                    className="font-label-sm text-label-sm uppercase tracking-widest text-primary"
                    htmlFor="login-password"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    // TODO: Add onClick
                    className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors underline cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                    lock
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg py-3.5 pl-11 pr-12 text-sm font-medium focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-black transition-colors p-1 cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary rounded-lg py-3.5 px-6 border border-primary font-label-sm text-label-sm uppercase tracking-widest hover:bg-surface-container-low hover:text-primary hover:border hover:border-primary transition-all duration-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:hover:bg-primary disabled:hover:text-on-primary disabled:hover:border-primary cursor-pointer"
              >
                <div className="h-6 flex items-center gap-2">
                  {loading ? (
                    <>
                      <span>Logging in...</span>
                      <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                    </>
                  ) : (
                    <>
                      <span>Login</span>
                      <span className="material-symbols-outlined text-sm">
                        arrow_forward
                      </span>
                    </>
                  )}
                </div>
              </button>
            </form>

            {/* Link to Register */}
            <div className="mt-6 text-center pt-4">
              <p className="font-body-md text-sm text-on-surface-variant">
                Don't have an account yet?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="text-primary font-semibold underline underline-offset-4 hover:opacity-80 transition-opacity ml-1 cursor-pointer"
                >
                  Create an account
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
