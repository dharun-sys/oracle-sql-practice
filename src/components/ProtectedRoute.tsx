import { ReactElement, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import * as auth from "@/lib/auth";

type Props = {
  children: ReactElement;
};

export default function ProtectedRoute({ children }: Props) {
  const authRaw = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
  const [status, setStatus] = useState<"loading" | "ok" | "unauth">(() => (authRaw ? "loading" : "unauth"));

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!authRaw) {
        if (mounted) setStatus("unauth");
        return;
      }

      try {
        const parsed = JSON.parse(authRaw);
        const register = parsed?.register_no;
        const token = localStorage.getItem("auth_token");
        if (!register || !token) {
          if (mounted) setStatus("unauth");
          return;
        }

        // verify session token and ensure it belongs to the register_no
        const sessionUserId = await auth.verifySessionToken(token);
        if (!sessionUserId) {
          localStorage.removeItem("auth_user");
          localStorage.removeItem("auth_token");
          if (mounted) setStatus("unauth");
          return;
        }

        const user = await auth.findUserByRegister(register);
        if (!user || user.id !== sessionUserId) {
          // token/user mismatch or user not found
          localStorage.removeItem("auth_user");
          localStorage.removeItem("auth_token");
          if (mounted) setStatus("unauth");
          return;
        }

        // update localStorage with server-authoritative values (prevents client-side tampering)
        const verified = {
          register_no: user.register_no,
          student_name: user.student_name || null,
          isAdmin: Boolean(user.is_admin),
        };
        localStorage.setItem("auth_user", JSON.stringify(verified));

        if (mounted) setStatus("ok");
      } catch (e) {
        console.warn("ProtectedRoute verification failed", e);
        localStorage.removeItem("auth_user");
        localStorage.removeItem("auth_token");
        if (mounted) setStatus("unauth");
      }
    })();

    return () => { mounted = false; };
  }, [authRaw]);

  if (status === "unauth") return <Navigate to="/login" replace />;
  if (status === "loading") return null; // or a spinner

  return children;
}
