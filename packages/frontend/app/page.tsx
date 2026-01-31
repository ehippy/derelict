"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setToken, isAuthenticated, clearToken } from "@/lib/auth";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isChecking, setIsChecking] = React.useState(true);

  useEffect(() => {
    // Check for token in URL (from OAuth callback)
    const token = searchParams.get("token");
    
    if (token) {
      // Store token and clean URL
      setToken(token);
      window.history.replaceState({}, "", "/");
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated()) {
      router.push("/login");
    } else {
      setIsChecking(false);
    }
  }, [searchParams, router]);

  const handleLogout = () => {
    clearToken();
    router.push("/login");
  };

  // Don't render anything while checking authentication
  if (isChecking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <div className="flex justify-end mb-8">
          <button
            onClick={handleLogout}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm"
          >
            Logout
          </button>
        </div>
        <h1 className="text-4xl font-bold mb-4">Othership</h1>
        <p className="text-xl text-gray-400">
          Cooperative survival horror in space
        </p>
        <p className="mt-8 text-sm text-gray-500">
          Game interface coming soon...
        </p>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900" />}>
      <HomeContent />
    </Suspense>
  );
}
