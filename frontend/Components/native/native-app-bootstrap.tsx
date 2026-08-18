"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export default function NativeAppBootstrap() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    document.documentElement.classList.add("agricore-native-app");
    document.documentElement.dataset.nativePlatform = Capacitor.getPlatform();

    return () => {
      document.documentElement.classList.remove("agricore-native-app");
      delete document.documentElement.dataset.nativePlatform;
    };
  }, []);

  return null;
}
