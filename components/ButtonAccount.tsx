/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Popover, Transition } from "@headlessui/react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/libs/supabase/client";
import Link from "next/link";

// A button to show user account info and actions (settings, logout)
const ButtonAccount = () => {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(profile);
  }, [supabase]);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      if (user) {
        fetchProfile(user.id);
      }
    };

    getUser();
  }, [supabase, fetchProfile]);

  // Listen for profile updates from other components
  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ fullName?: string }>;
      // If the event includes the name, update local state immediately
      if (customEvent.detail?.fullName !== undefined) {
        setProfile((prev: any) => ({ ...prev, full_name: customEvent.detail.fullName }));
      } else if (user) {
        // Otherwise refetch from the server
        fetchProfile(user.id);
      }
    };

    window.addEventListener("profile-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, [user, fetchProfile]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="relative">
      <Popover>
        {() => (
          <>
            <Popover.Button className="w-full flex items-center gap-3 hover:bg-base-300 rounded-lg p-2">
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user?.user_metadata?.avatar_url}
                  alt={"Profile picture"}
                  className="w-8 h-8 rounded-full"
                  referrerPolicy="no-referrer"
                  width={32}
                  height={32}
                />
              ) : (
                <div className="w-8 h-8 bg-primary text-primary-content flex justify-center items-center rounded-full capitalize">
                  {profile?.full_name?.charAt(0) || user?.email?.charAt(0)}
                </div>
              )}
              <div className="font-medium text-base-content text-left">
                {profile?.full_name
                  ? profile.full_name.split(' ')[0]
                  : user?.email?.split('@')[0] || 'Account'}
              </div>
              <div className="ml-auto text-base-content/60">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </Popover.Button>
            <Transition
              enter="transition duration-100 ease-out"
              enterFrom="transform scale-95 opacity-0"
              enterTo="transform scale-100 opacity-100"
              leave="transition duration-75 ease-out"
              leaveFrom="transform scale-100 opacity-100"
              leaveTo="transform scale-95 opacity-0"
            >
              <Popover.Panel className="absolute left-full bottom-0 ml-2 z-50">
                <div className="overflow-hidden rounded-xl shadow-2xl border border-white/10 bg-base-200/95 backdrop-blur-sm min-w-[180px]">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="font-medium text-white truncate">
                      {profile?.full_name || user?.email?.split('@')[0] || 'Account'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>

                  {/* Menu items */}
                  <div className="p-1.5">
                    <Link
                      href="/dashboard/account"
                      className="flex items-center gap-3 hover:bg-white/10 text-gray-300 hover:text-white duration-150 py-2.5 px-3 w-full rounded-lg"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      Account Settings
                    </Link>

                    <div className="my-1.5 border-t border-white/10" />

                    <button
                      className="flex items-center gap-3 hover:bg-error/20 text-gray-300 hover:text-error duration-150 py-2.5 px-3 w-full rounded-lg"
                      onClick={handleSignOut}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Log out
                    </button>
                  </div>
                </div>
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>
    </div>
  );
};

export default ButtonAccount;
