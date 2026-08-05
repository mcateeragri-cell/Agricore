"use client";

import { useEffect } from "react";
import { initialiseOfflineSync } from "@/lib/offline/technician-offline";
import { supabase } from "@/lib/supabase";

async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function OfflineBootstrap() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }
    return initialiseOfflineSync(token);
  }, []);
  return null;
}
