'use client';

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Navbar from "./navbar";
import AuthGate from "./auth-gate";

const AppShell = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  return (
    <AuthGate>
      {isLogin ? (
        <div className="min-h-screen bg-[#f5f5f7]">{children}</div>
      ) : (
        <div className="min-h-screen bg-[#f5f5f7]">
          <Navbar />
          <main className="px-4 pb-10 pt-4 sm:pt-6">
            <div className="mx-auto max-w-6xl space-y-6">{children}</div>
          </main>
        </div>
      )}
    </AuthGate>
  );
};

export default AppShell;
