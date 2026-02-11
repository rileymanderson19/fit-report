/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Popover, Transition } from "@headlessui/react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/libs/supabase/client";
import Link from "next/link";
import { Settings, LogOut, ChevronRight } from "lucide-react";

const ButtonAccount = ({ collapsed = false }: { collapsed?: boolean }) => {
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

  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ fullName?: string }>;
      if (customEvent.detail?.fullName !== undefined) {
        setProfile((prev: any) => ({ ...prev, full_name: customEvent.detail.fullName }));
      } else if (user) {
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

  const displayName = profile?.full_name
    ? profile.full_name.split(' ')[0]
    : user?.email?.split('@')[0] || 'Account';

  const avatarInitial = profile?.full_name?.charAt(0) || user?.email?.charAt(0);

  return (
    <div className="relative">
      <Popover>
        {() => (
          <>
            <Popover.Button
              className={`w-full flex items-center gap-3 hover:bg-white/10 rounded-lg p-2 transition-all duration-200 ${
                collapsed ? "justify-center" : ""
              }`}
              title={collapsed ? displayName : undefined}
            >
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user?.user_metadata?.avatar_url}
                  alt={"Profile picture"}
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  referrerPolicy="no-referrer"
                  width={32}
                  height={32}
                />
              ) : (
                <div className="w-8 h-8 bg-blue-600 text-white flex justify-center items-center rounded-full capitalize text-sm font-medium flex-shrink-0">
                  {avatarInitial}
                </div>
              )}

              {/* Name + chevron with fade transition */}
              <span
                className={`flex items-center gap-3 min-w-0 flex-1 whitespace-nowrap transition-all duration-300 ${
                  collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
                }`}
              >
                <span className="font-medium text-gray-200 text-left text-sm truncate">
                  {displayName}
                </span>
                <span className="ml-auto text-gray-500">
                  <ChevronRight className="w-4 h-4" />
                </span>
              </span>
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
                <div className="overflow-hidden rounded-xl shadow-lg border border-gray-200 bg-white min-w-[200px]">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {profile?.full_name || user?.email?.split('@')[0] || 'Account'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>

                  <div className="p-1.5">
                    <Link
                      href="/dashboard/account"
                      className="flex items-center gap-3 hover:bg-gray-50 text-gray-600 hover:text-gray-900 duration-150 py-2.5 px-3 w-full rounded-lg text-sm"
                    >
                      <Settings className="w-4 h-4 text-gray-400" />
                      Account Settings
                    </Link>

                    <div className="my-1 border-t border-gray-100" />

                    <button
                      className="flex items-center gap-3 hover:bg-red-50 text-gray-600 hover:text-red-600 duration-150 py-2.5 px-3 w-full rounded-lg text-sm"
                      onClick={handleSignOut}
                    >
                      <LogOut className="w-4 h-4 text-gray-400" />
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
