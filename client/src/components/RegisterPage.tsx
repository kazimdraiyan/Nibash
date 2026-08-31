import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface RegisterPageProps {
  onRegisterSuccess?: (data: { email: string }) => void; // TODO: Is token needed along with email?
}

export function RegisterPage({ onRegisterSuccess }: RegisterPageProps) {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [nid, setNID] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // TODO: Match client side validations with server/src/schemas/auth.schema.ts
    if (!name.trim()) {
      setError("Name cannot be empty.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!phone.startsWith("01") || phone.length !== 11) {
      setError("Enter a valid 11-digit phone number.");
      return;
    }
    if (![10, 13, 17].includes(nid.length)) {
      setError("NID must be 10, 13, or 17 digits.");
      return;
    }
    if (!agreeTerms) {
      setError("You must agree to the Terms and Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
          nid: nid.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "An error occurred.");
      }

      onRegisterSuccess?.({ email });
      navigate("/login"); // Redirect to login page after successful registration
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
        <div className="lg:col-span-4 hidden lg:flex flex-col justify-between p-8 bg-surface-container-low border-hairline rounded-xl sticky top-28">
          <div>
            <h2 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary leading-tight mb-4">
              Join <b>Nibash</b>
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">
              {/* // TODO: Replace with actual branding message */}
              Lorem ipsum dolor sit, amet consectetur adipisicing elit.
              Reprehenderit deserunt corporis asperiores aspernatur, consectetur
              exercitationem?
            </p>
          </div>

          <div className="flex flex-col gap-4 pt-6">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-xl mt-0.5">
                verified_user
              </span>
              <div>
                <span className="block font-headline-md text-base text-primary font-medium">
                  NID Authentication
                </span>
                <span className="font-body-md text-xs text-on-surface-variant">
                  Prevent impersonation and double-listings .
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-xl mt-0.5">
                description
              </span>
              <div>
                <span className="block font-headline-md text-base text-primary font-medium">
                  Digital Agreements
                </span>
                <span className="font-body-md text-xs text-on-surface-variant">
                  Legally structured online lease contracts.
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-xl mt-0.5">
                account_balance_wallet
              </span>
              <div>
                <span className="block font-headline-md text-base text-primary font-medium">
                  Payment History
                </span>
                <span className="font-body-md text-xs text-on-surface-variant">
                  Track rent, deposits, and automated receipts.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Register Form */}
        <div className="lg:col-span-8 flex flex-col justify-center">
          <div className="bg-surface-container-lowest border-hairline rounded-xl p-8 md:p-10 w-full">
            {/* Header */}
            <div className="mb-8">
              <h1 className="font-headline-md text-headline-md font-bold text-primary mt-2">
                Create Your Account
              </h1>
            </div>

            {/* Error Alerts */}
            {error && (
              <div className="mb-6 p-4 bg-error-container/40 border border-error/30 rounded-lg flex items-start gap-3 text-on-error-container">
                <span className="material-symbols-outlined text-error text-xl shrink-0 mt-0.5">
                  error
                </span>
                <div className="font-body-md text-sm">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* // TODO: Make the input field types proper */}
                {/* // TODO: Add required marker */}

                {/* Full Name */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="font-label-sm text-label-sm uppercase tracking-widest text-primary"
                    htmlFor="reg-name"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                      badge
                    </span>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name as per NID"
                      className="w-full bg-surface-container-lowest border-hairline rounded-lg py-3 pl-11 pr-4 font-body-md text-body-md focus:outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/60"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="font-label-sm text-label-sm uppercase tracking-widest text-primary"
                    htmlFor="reg-email"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                      mail
                    </span>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full bg-surface-container-lowest border-hairline rounded-lg py-3 pl-11 pr-4 font-body-md text-body-md focus:outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/60"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="font-label-sm text-label-sm uppercase tracking-widest text-primary"
                    htmlFor="reg-phone"
                  >
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                      call
                    </span>
                    <input
                      id="reg-phone"
                      type="tel"
                      required
                      maxLength={11}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="11 digit phone number"
                      className="w-full bg-surface-container-lowest border-hairline rounded-lg py-3 pl-11 pr-4 font-body-md text-body-md focus:outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/60"
                    />
                  </div>
                </div>

                {/* National ID */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className="font-label-sm text-label-sm uppercase tracking-widest text-primary"
                    htmlFor="reg-nid"
                  >
                    National ID
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                      credit_card
                    </span>
                    <input
                      id="reg-nid"
                      type="text"
                      required
                      maxLength={17}
                      value={nid}
                      onChange={(e) => setNID(e.target.value)}
                      placeholder="10, 13, or 17 digit NID"
                      className="w-full bg-surface-container-lowest border-hairline rounded-lg py-3 pl-11 pr-4 font-body-md text-body-md focus:outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/60"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label
                    className="font-label-sm text-label-sm uppercase tracking-widest text-primary"
                    htmlFor="reg-password"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                      lock
                    </span>
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full bg-surface-container-lowest border-hairline rounded-lg py-3 pl-11 pr-11 font-body-md text-body-md focus:outline-none focus:border-primary transition-colors placeholder:text-on-surface-variant/60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors p-1 cursor-pointer"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      <span className="absolute right-0 top-1/2 -translate-y-1/2 material-symbols-outlined text-xl">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Agreement Checkbox */}
              <div className="flex items-start gap-2.5 py-1">
                <input
                  id="reg-terms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-hairline text-primary focus:ring-0 focus:outline-none accent-primary cursor-pointer mt-0.5"
                />
                <label
                  htmlFor="reg-terms"
                  className="font-body-md text-xs text-on-surface-variant cursor-pointer select-none leading-relaxed"
                >
                  I certify that the information provided is accurate and agree
                  to the {/* // TODO: Add ToS and Privacy Policy links */}
                  <span className="text-primary underline">
                    Nibash Terms of Service
                  </span>{" "}
                  and{" "}
                  <span className="text-primary underline">Privacy Policy</span>
                  .
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary rounded-lg py-3.5 px-6 border border-primary font-label-sm text-label-sm uppercase tracking-widest hover:bg-surface-container-low hover:text-primary hover:border hover:border-primary transition-all duration-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:hover:bg-primary disabled:hover:text-on-primary disabled:hover:border-primary cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <span className="material-symbols-outlined text-sm">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* Link to Login */}
            <div className="mt-6 text-center pt-4">
              <p className="font-body-md text-sm text-on-surface-variant">
                Already registered with Nibash?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-primary font-semibold underline underline-offset-4 hover:opacity-80 transition-opacity ml-1 cursor-pointer"
                >
                  Login
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
