import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as auth from "@/lib/auth";

const Login = () => {
  const [registerNumber, setRegisterNumber] = useState("");
  const [step, setStep] = useState<"ask" | "create" | "login">("ask");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const navigate = useNavigate();

  const handleCheckRegister = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await auth.findUserByRegister(registerNumber.trim());
      if (!user) {
        setError("Invalid register number");
        setStep("ask");
      } else if (!user.password) {
        setStep("create");
      } else {
        setStep("login");
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await auth.createPasswordForRegister(registerNumber.trim(), password);
      // fetch the user record to persist display name
      const userInfo = await auth.findUserByRegister(registerNumber.trim());
      // persist a simple auth flag so ProtectedRoute can guard routes
      localStorage.setItem(
        "auth_user",
        JSON.stringify({
          register_no: registerNumber.trim(),
          student_name: userInfo?.student_name ?? null,
          isAdmin: Boolean(userInfo?.is_admin ?? (userInfo as any)?.isAdmin ?? false),
        })
      );
      navigate("/home");
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const ok = await auth.verifyPasswordForRegister(registerNumber.trim(), password);
      if (!ok) {
        setError("Invalid password");
      } else {
        // persist a simple auth flag so ProtectedRoute can guard routes
        const userInfo = await auth.findUserByRegister(registerNumber.trim());
        localStorage.setItem(
          "auth_user",
          JSON.stringify({
            register_no: registerNumber.trim(),
            student_name: userInfo?.student_name ?? null,
            isAdmin: Boolean(userInfo?.is_admin ?? (userInfo as any)?.isAdmin ?? false),
          })
        );
        navigate("/home");
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4 text-center">Sign in</h2>

        {step === "ask" && (
          <form onSubmit={handleCheckRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Register Number</label>
              <input
                value={registerNumber}
                onChange={(e) => setRegisterNumber(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your register number"
                required
              />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex items-center justify-between">
              <button
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
                type="submit"
              >
                {loading ? "Checking..." : "Next"}
              </button>
            </div>
          </form>
        )}

        {step === "create" && (
          <form onSubmit={handleCreatePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Create Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="New password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirm password"
                required
              />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-sm text-gray-600 hover:underline"
                onClick={() => setStep("ask")}
                disabled={loading}
              >
                Back
              </button>
              <button
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                disabled={loading}
                type="submit"
              >
                {loading ? "Saving..." : "Create Password"}
              </button>
            </div>
          </form>
        )}

        {step === "login" && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}

            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-sm text-gray-600 hover:underline"
                onClick={() => setStep("ask")}
                disabled={loading}
              >
                Back
              </button>
              <button
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={loading}
                type="submit"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
