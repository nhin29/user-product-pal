import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const authStatus = sessionStorage.getItem("isAuthenticated") === "true";
    setIsAuthenticated(authStatus);

    if (!authStatus && location.pathname !== "/login") {
      navigate("/login");
    }
  }, [navigate, location.pathname]);

  const logout = () => {
    sessionStorage.removeItem("isAuthenticated");
    setIsAuthenticated(false);
    navigate("/login");
  };

  return { isAuthenticated, logout };
}

export function useRequireAuth() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}
