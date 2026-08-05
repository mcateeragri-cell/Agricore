"use client";

import { useEffect } from "react";

import { supabase } from "@/lib/supabase";
import { initialiseOfflineSync } from "@/lib/offline/technician-offline";

async function token() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function OfflineBootstrap() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      void navigator.serviceWorker.register("/sw.js");
    }

    return initialiseOfflineSync(token);
  }, []);

  return null;
}