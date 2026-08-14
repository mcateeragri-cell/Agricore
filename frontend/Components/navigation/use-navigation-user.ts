"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  initialUserState,
  isPlatformRole,
  isUserRole,
  type CompanyContextResponse,
  type UserNavigationState,
} from "./navigation-types";

export function useNavigationUser() {
  const router = useRouter();

  const [userState, setUserState] =
    useState<UserNavigationState>(
      initialUserState,
    );

  const [loading, setLoading] =
    useState(true);

  const [
    switchingCompany,
    setSwitchingCompany,
  ] = useState(false);

  const [switchingBranch, setSwitchingBranch] = useState(false);

  const [error, setError] =
    useState("");

  const loadCurrentUser =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/auth/company-context",
          {
            method: "GET",
            cache: "no-store",
            credentials: "same-origin",
          },
        );

        const result =
          (await response.json()) as
            CompanyContextResponse;

        if (!response.ok) {
          if (response.status === 401) {
            setUserState(
              initialUserState,
            );
            return;
          }

          throw new Error(
            result.error ||
              "Unable to load your AgriCore account.",
          );
        }

        setUserState({
          fullName:
            result.user?.fullName ||
            result.user?.email?.split(
              "@",
            )[0] ||
            "AgriCore User",

          email:
            result.user?.email ?? "",

          platformRole:
            isPlatformRole(
              result.user
                ?.platformRole,
            )
              ? result.user
                  .platformRole
              : null,

          role: isUserRole(
            result.user?.role,
          )
            ? result.user.role
            : null,

          permissions: Array.from(
            new Set(
              result.user
                ?.permissions ?? [],
            ),
          ),

          enabledFeatures: Array.from(
            new Set(result.enabledFeatures ?? []),
          ),

          activeCompany:
            result.activeCompany ??
            null,

          companies:
            result.companies ?? [],
          branches: result.branches ?? [],
          activeBranchId: result.activeBranchId ?? null,
          activeFinanceBranchId: result.activeFinanceBranchId ?? null,
          branchAccess: result.branchAccess ?? null,
        });
      } catch (loadError) {
        console.error(
          "Unable to load navigation user context:",
          loadError,
        );

        setUserState(
          initialUserState,
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load your AgriCore account.",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadCurrentUser();
  }, [loadCurrentUser]);

  const switchCompany =
    useCallback(
      async (
        companyId: string,
      ) => {
        const requestedCompanyId =
          companyId.trim();

        if (
          !requestedCompanyId ||
          requestedCompanyId ===
            userState
              .activeCompany?.id ||
          switchingCompany
        ) {
          return;
        }

        setSwitchingCompany(true);
        setError("");

        try {
          const response =
            await fetch(
              "/api/auth/company-context",
              {
                method: "POST",
                credentials:
                  "same-origin",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body: JSON.stringify({
                  companyId:
                    requestedCompanyId,
                }),
              },
            );

          const result =
            (await response.json()) as
              CompanyContextResponse;

          if (!response.ok) {
            throw new Error(
              result.error ||
                "Unable to switch company.",
            );
          }

          await loadCurrentUser();

          router.refresh();

          /*
           * A full reload guarantees that server
           * components, API data and permissions all
           * use the newly selected company cookie.
           */
          window.location.reload();
        } catch (switchError) {
          console.error(
            "Unable to switch active company:",
            switchError,
          );

          setError(
            switchError instanceof Error
              ? switchError.message
              : "Unable to switch company.",
          );
        } finally {
          setSwitchingCompany(false);
        }
      },
      [
        loadCurrentUser,
        router,
        switchingCompany,
        userState
          .activeCompany?.id,
      ],
    );

  const switchBranch = useCallback(
    async (branchId: string) => {
      const requestedBranchId = branchId.trim();
      if (!requestedBranchId || requestedBranchId === userState.activeBranchId || switchingBranch) return;

      setSwitchingBranch(true);
      setError("");
      try {
        const response = await fetch("/api/auth/branch-context", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branchId: requestedBranchId }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to switch depot.");
        await loadCurrentUser();
        router.refresh();
        window.location.reload();
      } catch (switchError) {
        console.error("Unable to switch active depot:", switchError);
        setError(switchError instanceof Error ? switchError.message : "Unable to switch depot.");
      } finally {
        setSwitchingBranch(false);
      }
    },
    [loadCurrentUser, router, switchingBranch, userState.activeBranchId],
  );

  return {
    userState,
    loading,
    switchingCompany,
    switchingBranch,
    error,
    reload: loadCurrentUser,
    switchCompany,
    switchBranch,
  };
}