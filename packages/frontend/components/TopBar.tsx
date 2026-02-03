import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ServerSelector } from "./ServerSelector";

interface TopBarProps {
  avatar: string | null;
  discordUserId: string | null;
  username: string | null;
  onLogout: () => void;
  onSelectGuild: (guildId: string, guildName: string, guildIcon?: string) => void;
  selectedGuildName?: string;
  selectedGuildId?: string | null;
  selectedGuildIcon?: string | null;
}

export function TopBar({ avatar, discordUserId, username, onLogout, onSelectGuild, selectedGuildName, selectedGuildId, selectedGuildIcon }: TopBarProps) {
  const [showGuilds, setShowGuilds] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getAvatarUrl = (userId: string, avatarHash: string | null): string => {
    if (!avatarHash) {
      return `https://cdn.discordapp.com/embed/avatars/${parseInt(userId) % 5}.png`;
    }
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`;
  };

  const getGuildIconUrl = (guildId: string, iconHash: string | null): string => {
    if (!iconHash) {
      return `https://cdn.discordapp.com/embed/avatars/0.png`;
    }
    return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png`;
  };

  return (
    <>
      {/* Guilds selector popup */}
      {showGuilds && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowGuilds(false)}
          />
          <div className="fixed top-16 left-0 right-0 sm:left-4 sm:right-auto sm:w-80 z-50 p-4 sm:p-0">
            <ServerSelector 
              onClose={() => setShowGuilds(false)}
              onSelectGuild={onSelectGuild}
            />
          </div>
        </>
      )}

      {/* User menu popup */}
      {showUserMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowUserMenu(false)}
          />
          <div className="fixed top-16 right-4 z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-2 w-48">
              <button
                onClick={() => {
                  onLogout();
                  setShowUserMenu(false);
                }}
                className="w-full px-3 py-2 text-left text-gray-300 hover:bg-gray-700 rounded transition-colors text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </>
      )}

      {/* Navigation bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-gray-800 border-b border-gray-700 flex items-center px-4 z-40 gap-3 sm:gap-6">
        {/* Logo */}
        <Link to="/" className="text-lg sm:text-xl font-bold text-white tracking-widest hover:text-gray-300 transition-colors">
          <span className="hidden sm:inline">DERELICT</span>
          <span className="sm:hidden">D</span>
        </Link>

        {/* Navigation links */}
        <nav className="flex items-center gap-1 sm:gap-4 flex-1">
          {/* Guilds dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowGuilds(!showGuilds)}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              {selectedGuildId && selectedGuildIcon !== undefined && (
                <img
                  src={getGuildIconUrl(selectedGuildId, selectedGuildIcon)}
                  alt=""
                  className="w-5 h-5 rounded-full"
                />
              )}
              <span className="text-xs sm:text-sm font-medium">
                {selectedGuildName || "Servers"}
              </span>
              <span className="text-xs text-gray-400">{showGuilds ? "▲" : "▼"}</span>
            </button>
          </div>

          {/* Scenarios link */}
          <Link
            to="/scenarios"
            className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            Scenarios
          </Link>

          {/* FAQ link */}
          <Link
            to="/faq"
            className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            FAQ
          </Link>
        </nav>

        {/* User menu */}
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 hover:bg-gray-700 rounded transition-colors"
        >
          {avatar && discordUserId && (
            <img
              src={getAvatarUrl(discordUserId, avatar)}
              alt="User avatar"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full"
            />
          )}
          <span className="hidden md:block text-sm text-gray-300">{username}</span>
          <span className="text-xs text-gray-400">{showUserMenu ? "▲" : "▼"}</span>
        </button>
      </div>
    </>
  );
}
