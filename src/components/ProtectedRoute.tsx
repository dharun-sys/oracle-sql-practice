import { ReactElement } from "react";
import { Navigate } from "react-router-dom";

type Props = {
  children: ReactElement;
};

export default function ProtectedRoute({ children }: Props) {
  const auth = localStorage.getItem("auth_user");
  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
