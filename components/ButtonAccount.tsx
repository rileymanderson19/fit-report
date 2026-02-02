/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { Popover, Transition } from "@headlessui/react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/libs/supabase/client";
import apiClient from "@/libs/api";
import Link from "next/link";

// A button to show user some account actions
//  1. Billing: open a Stripe Customer Portal to manage their billing (cancel subscription, update payment method, etc.).
//     You have to manually activate the Customer Portal in your Stripe Dashboard (https://dashboard.stripe.com/test/settings/billing/portal)
//     This is only available if the customer has a customerId (they made a purchase previously)
//  2. Logout: sign out and go back to homepage
// See more at https://shipfa.st/docs/components/buttonAccount
const ButtonAccount = () => {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(profile);
      }
    };

    getUser();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const handleBilling = async () => {
    setIsLoading(true);

    try {
      const { url }: { url: string } = await apiClient.post(
        "/stripe/create-portal",
        {
          returnUrl: window.location.href,
        }
      );

      window.location.href = url;
    } catch (e) {
      console.error(e);
    }

    setIsLoading(false);
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
              {isLoading ? (
                <span className="loading loading-spinner loading-xs ml-auto"></span>
              ) : (
                <div className="ml-auto text-base-content/60">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              )}
            </Popover.Button>
            <Transition
              enter="transition duration-100 ease-out"
              enterFrom="transform scale-95 opacity-0"
              enterTo="transform scale-100 opacity-100"
              leave="transition duration-75 ease-out"
              leaveFrom="transform scale-100 opacity-100"
              leaveTo="transform scale-95 opacity-0"
            >
              <Popover.Panel className="absolute left-full top-0 ml-2 z-[-9999]">
                <div className="overflow-hidden rounded-lg shadow-xl ring-1 ring-base-content ring-opacity-5 bg-base-100 p-1">
                  <div className="space-y-0.5 text-sm">
                    {!profile?.full_name && (
                      <Link
                        href="/dashboard/account"
                        className="flex items-center gap-2 hover:bg-primary/20 hover:text-primary duration-200 py-1.5 px-3 w-full rounded-md whitespace-nowrap"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                          <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        Complete Profile
                      </Link>
                    )}

                    <button
                      className="flex items-center gap-2 hover:bg-base-300 duration-200 py-1.5 px-3 w-full rounded-md whitespace-nowrap"
                      onClick={handleBilling}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="14" x="2" y="5" rx="2"></rect>
                        <line x1="2" x2="22" y1="10" y2="10"></line>
                      </svg>
                      Billing
                    </button>

                    <button
                      className="flex items-center gap-2 hover:bg-error/20 hover:text-error duration-200 py-1.5 px-3 w-full rounded-md whitespace-nowrap"
                      onClick={handleSignOut}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      Logout
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
