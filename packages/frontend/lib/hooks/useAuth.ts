import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  setToken,
  isAuthenticated,
  clearToken,
  getUsername,
  getAvatar,
  getDiscordUserId,
} from "@/lib/auth";

interface User {
  username: string | null;
  avatar: string | null;
  discordUserId: string | null;
}

export function useAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User>({
    username: null,
    avatar: null,
    discordUserId: null,
  });

  useEffect(() => {
    // Check for token in URL (from OAuth callback)
    const token = searchParams.get("token");

    if (token) {
      // Store token and clean URL
      setToken(token);
      window.history.replaceState({}, "", "/");
      setIsLoading(false);
      setUser({
        username: getUsername(),
        avatar: getAvatar(),
        discordUserId: getDiscordUserId(),
      });
    } else if (!isAuthenticated()) {
      // Redirect to login if not authenticated
      navigate("/login");
    } else {
      // Already authenticated
      setIsLoading(false);
      setUser({
        username: getUsername(),
        avatar: getAvatar(),
        discordUserId: getDiscordUserId(),
      });
    }
  }, [searchParams, navigate]);

  const logout = () => {
    clearToken();
    navigate("/login");
  };

  return { isLoading, user, logout };
}
