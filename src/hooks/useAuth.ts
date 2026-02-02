import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    const sync = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;
      const authed = !!data.session && !error;
      setIsAuthenticated(authed);
      if (!authed && location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void sync();
    });

    void sync();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  const logout = () => {
    void supabase.auth.signOut();
    setIsAuthenticated(false);
    navigate("/login", { replace: true });
  };

  return { isAuthenticated, logout };
}

export function useRequireAuth() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}
