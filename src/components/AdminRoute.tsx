import { ReactElement } from "react";
import { Navigate } from "react-router-dom";

type Props = {
  children: ReactElement;
};

export default function AdminRoute({ children }: Props) {
  const authRaw = localStorage.getItem("auth_user");
  if (!authRaw) return <Navigate to="/login" replace />;
  try {
    const authObj = JSON.parse(authRaw);
    if (!authObj?.isAdmin) {
      return <Navigate to="/home" replace />;
    }
  } catch (e) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
