'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";

const Navbar = () => {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-[#f5f5f7]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          GST Ledger
        </Link>
        {user && (
          <nav className="hidden items-center gap-4 text-sm font-medium text-slate-700 sm:flex">
            <Link href="/" className="hover:text-blue-700">
              Dashboard
            </Link>
            <Link href="/transactions" className="hover:text-blue-700">
              Transactions
            </Link>
            <Link href="/gst-return" className="hover:text-blue-700">
              GST return
            </Link>
            <Link href="/settings" className="hover:text-blue-700">
              Settings
            </Link>
          </nav>
        )}
        {user && (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:text-blue-700"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
