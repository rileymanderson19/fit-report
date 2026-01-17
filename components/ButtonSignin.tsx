/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/libs/supabase/client";
import config from "@/config";

// A simple button to sign in with our providers (Google & Magic Links).
// It automatically redirects user to callbackUrl (config.auth.callbackUrl) after login, which is normally a private page for users to manage their accounts.
// If the user is already logged in, it will show their profile picture & redirect them to callbackUrl immediately.
const ButtonSignin = ({
  text = "Sign In",
  extraStyle,
}: {
  text?: string;
  extraStyle?: string;
}) => {
  const supabase = createClient();
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
    };

    getUser();
  }, [supabase]);

  if (user) {
    return (
      <Link
        href={config.auth.callbackUrl}
        className={`group relative inline-flex items-center justify-center px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
          extraStyle?.includes('btn-primary')
            ? 'btn-gradient hover:scale-105'
            : 'glass border border-white/10 hover:border-accent-purple/50'
        }`}
      >
        {user?.user_metadata?.avatar_url ? (
          <img
            src={user?.user_metadata?.avatar_url}
            alt="Account"
            className="w-6 h-6 rounded-full"
            referrerPolicy="no-referrer"
            width={24}
            height={24}
          />
        ) : (
          <span className="w-6 h-6 flex justify-center items-center rounded-full bg-accent-purple/20 text-accent-purple text-sm font-semibold">
            {user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0)}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      className={`group relative inline-flex items-center justify-center px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
        extraStyle?.includes('btn-primary')
          ? 'btn-gradient hover:scale-105'
          : 'glass border border-white/10 hover:border-accent-purple/50 text-white'
      }`}
      href={config.auth.loginUrl}
    >
      {text}
    </Link>
  );
};

export default ButtonSignin;
