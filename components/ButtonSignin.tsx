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
        className="inline-flex items-center justify-center w-9 h-9 rounded-full overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors"
        title="Go to Dashboard"
      >
        {user?.user_metadata?.avatar_url ? (
          <img
            src={user?.user_metadata?.avatar_url}
            alt="Account"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            width={36}
            height={36}
          />
        ) : (
          <span className="w-full h-full flex justify-center items-center bg-blue-600 text-white text-sm font-semibold">
            {user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0)}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 ${
        extraStyle || 'btn-secondary px-5 py-2.5'
      }`}
      href={config.auth.loginUrl}
    >
      {text}
    </Link>
  );
};

export default ButtonSignin;
