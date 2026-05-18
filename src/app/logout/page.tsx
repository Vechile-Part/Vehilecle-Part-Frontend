"use client";

import { useEffect } from "react";
import { logoutAndGoToLogin } from "@/lib/session";

export default function LogoutPage() {
  useEffect(() => {
    logoutAndGoToLogin();
  }, []);

  return null;
}
