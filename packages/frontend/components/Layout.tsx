import React from "react";
import { TopBar } from "./TopBar";
import { useOptionalAuth, useAuth } from "@/lib/hooks/useAuth";
import { useGuildSelection } from "@/lib/hooks/useGuildSelection";

interface LayoutProps {
  children: React.ReactNode;
  topBarMode?: 'fixed' | 'hamburger';
  className?: string;
}

export function Layout({ children, topBarMode = 'fixed', className }: LayoutProps) {
  // Always use optional auth - pages that need required auth will redirect via their own logic
  const { user, logout } = useOptionalAuth();
  const { selectedGuild, selectGuild } = useGuildSelection();

  const mainClasses = `min-h-screen bg-gradient-to-b from-gray-900 to-black text-white ${topBarMode === 'fixed' ? 'pt-16' : ''} ${className || ''}`;

  return (
    <main className={mainClasses}>
      <TopBar
        avatar={user?.avatar || null}
        discordUserId={user?.discordUserId || null}
        username={user?.username || null}
        onLogout={logout}
        onSelectGuild={selectGuild}
        selectedGuildName={selectedGuild?.name}
        selectedGuildId={selectedGuild?.id || null}
        selectedGuildIcon={selectedGuild?.icon || null}
        mode={topBarMode}
      />
      
      {children}
    </main>
  );
}

