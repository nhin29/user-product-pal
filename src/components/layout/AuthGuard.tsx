import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Loader2, ShieldX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Cache admin role check to avoid repeated queries
  const adminCacheRef = useRef<{ userId: string; isAdmin: boolean } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;

      const authed = !!data.session && !error;
      setIsAuthenticated(authed);

      if (authed && data.session) {
        const userId = data.session.user.id;
        
        // Use cached result if same user
        if (adminCacheRef.current?.userId === userId) {
          setIsAdmin(adminCacheRef.current.isAdmin);
        } else {
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .single();

          if (isMounted) {
            const admin = roleData?.role === "admin";
            setIsAdmin(admin);
            adminCacheRef.current = { userId, isAdmin: admin };
          }
        }
      } else {
        setIsAdmin(false);
        adminCacheRef.current = null;
      }

      setIsChecking(false);

      if (!authed && location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event) => {
      // Invalidate cache on sign out
      if (_event === "SIGNED_OUT") {
        adminCacheRef.current = null;
      }
      void syncSession();
    });

    void syncSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated && location.pathname !== "/login") {
    return null;
  }

  if (isAuthenticated && !isAdmin && location.pathname !== "/login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <ShieldX className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground max-w-sm">
            You don't have permission to access the admin panel. Only administrators can access this area.
          </p>
          <Button onClick={handleLogout} variant="outline">
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
