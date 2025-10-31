import { ReactElement, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import * as auth from "@/lib/auth";

type Props = {
  children: ReactElement;
};

export default function AdminRoute({ children }: Props) {
  const authRaw = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
  const [status, setStatus] = useState<"loading" | "ok" | "forbidden" | "unauth">(() => (authRaw ? "loading" : "unauth"));

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

        const sessionUserId = await auth.verifySessionToken(token);
        if (!sessionUserId) {
          localStorage.removeItem("auth_user");
          localStorage.removeItem("auth_token");
          if (mounted) setStatus("unauth");
          return;
        }

        const user = await auth.findUserByRegister(register);
        if (!user || user.id !== sessionUserId) {
          localStorage.removeItem("auth_user");
          localStorage.removeItem("auth_token");
          if (mounted) setStatus("unauth");
          return;
        }

        // update localStorage with authoritative values (prevent tampering)
        const verified = {
          register_no: user.register_no,
          student_name: user.student_name || null,
          isAdmin: Boolean(user.is_admin),
        };
        localStorage.setItem("auth_user", JSON.stringify(verified));

        if (user.is_admin) {
          if (mounted) setStatus("ok");
        } else {
          if (mounted) setStatus("forbidden");
        }
      } catch (e) {
        console.warn("AdminRoute verification failed", e);
        localStorage.removeItem("auth_user");
        localStorage.removeItem("auth_token");
        if (mounted) setStatus("unauth");
      }
    })();

    return () => { mounted = false; };
  }, [authRaw]);

  if (status === "unauth") return <Navigate to="/login" replace />;
  if (status === "loading") return null; // or a spinner
  if (status === "forbidden") return <Navigate to="/home" replace />;

  return children;
}
