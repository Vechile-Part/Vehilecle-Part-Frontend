"use client";

import { useEffect } from "react";
import { useAuth } from "@/Components/auth/AuthContext";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    logout();
    router.replace("/auth/login");
  }, [logout, router]);

  return null;
}
