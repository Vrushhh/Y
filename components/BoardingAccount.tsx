"use client";

import { useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import { getSupabase } from "@/lib/supabase/client";

export function BoardingAccount() {
  const { ready, email } = useApp();
  const [switching, setSwitching] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!ready || !email || email.toLowerCase() === "vrushabhcr7@gmail.com") return null;

  const switchAccount = async () => {
    setSwitching(true);
    setFailed(false);
    try {
      const { error } = await getSupabase()!.auth.signOut({ scope: "local" });
      if (error) throw error;
      window.location.assign("/login?next=%2Funiverse");
    } catch {
      setFailed(true);
      setSwitching(false);
    }
  };

  return (
    <div className="text-center text-xs text-lilac">
      <p>Signed in to Our Little Universe as {email}</p>
      <button type="button" disabled={switching} onClick={switchAccount} className="mt-1 text-blush underline">
        {switching ? "Signing out…" : "Switch account"}
      </button>
      {failed && <p role="alert">Couldn’t sign out. Please try again.</p>}
    </div>
  );
}
