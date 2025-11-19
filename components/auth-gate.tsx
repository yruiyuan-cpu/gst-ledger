'use client';

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "./auth-provider";

const AuthGate = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginRoute = pathname === "/login";

  useEffect(() => {
    if (isLoginRoute) return;
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [isLoginRoute, loading, router, user]);

  if (isLoginRoute) {
    if (!loading && user) {
      router.replace("/");
    }
    return <>{children}</>;
  }

  if (loading || (!user && !isLoginRoute)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] text-sm text-slate-600">
        Checking your session…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default AuthGate;
