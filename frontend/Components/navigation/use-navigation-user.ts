"use client";

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

import {
  initialUserState,
  isUserRole,
  type UserNavigationState,
} from "./navigation-types";

export function useNavigationUser() {
  const [userState, setUserState] =
    useState<UserNavigationState>(initialUserState);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        if (userError.name !== "AuthSessionMissingError") {
          console.error("Unable to load current user:", userError);
        }

        setUserState(initialUserState);
        return;
      }

      if (!user) {
        setUserState(initialUserState);
        return;
      }

      const [
        { data: profile, error: profileError },
        { data: roleRecord, error: roleError },
      ] = await Promise.all([
        supabase
          .from("app_user_profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("app_user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (profileError) {
        console.error("Unable to load navigation profile:", profileError);
      }

      if (roleError) {
        console.error("Unable to load navigation role:", roleError);
      }

      const role = isUserRole(roleRecord?.role)
        ? roleRecord.role
        : null;

      let permissions: string[] = [];

      if (role) {
        const {
          data: permissionRows,
          error: permissionsError,
        } = await supabase
          .from("app_role_permissions")
          .select("permission_key")
          .eq("role", role)
          .eq("allowed", true);

        if (permissionsError) {
          console.error(
            "Unable to load navigation permissions:",
            permissionsError,
          );
        } else {
          permissions =
            permissionRows?.map((row) => String(row.permission_key)) ?? [];
        }
      }

      const metadataName =
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : "";

      setUserState({
        fullName:
          profile?.full_name ||
          metadataName ||
          user.email?.split("@")[0] ||
          "AgriCore User",
        email: user.email ?? "",
        role,
        permissions,
      });
    } catch (error) {
      console.error("Unable to load navigation user:", error);
      setUserState(initialUserState);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

  return {
    userState,
    loading,
  };
}