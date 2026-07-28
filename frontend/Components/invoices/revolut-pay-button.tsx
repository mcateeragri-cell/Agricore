"use client";

import { useEffect, useState } from "react";
import type {
  CreatePaymentLinkResponse,
} from "@/lib/payments/types";

type Props = {
  invoiceId: string;
  existingPaymentUrl?: string | null;
  disabled?: boolean;
  className?: string;
  onCreated?: (paymentUrl: string) => void;
};

export default function RevolutPayButton({
  invoiceId,
  existingPaymentUrl,
  disabled = false,
  className = "",
  onCreated,
}: Props) {
  const [paymentUrl, setPaymentUrl] =
    useState(existingPaymentUrl ?? "");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    setPaymentUrl(
      existingPaymentUrl ?? "",
    );
  }, [existingPaymentUrl]);

  async function handleClick() {
    if (disabled || loading) {
      return;
    }

    setError("");

    if (paymentUrl) {
      window.open(
        paymentUrl,
        "_blank",
        "noopener,noreferrer",
      );

      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/payments/revolut/create",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            invoiceId,
          }),
        },
      );

      const body =
        (await response.json()) as CreatePaymentLinkResponse;

      if (
        !response.ok ||
        !body.success ||
        !body.paymentUrl
      ) {
        throw new Error(
          body.error ??
            "Unable to create the Revolut payment link.",
        );
      }

      setPaymentUrl(body.paymentUrl);

      onCreated?.(
        body.paymentUrl,
      );

      window.open(
        body.paymentUrl,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create the Revolut payment link.",
      );
    } finally {
      setLoading(false);
    }
  }

  const buttonClassName =
    className ||
    "w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() =>
          void handleClick()
        }
        className={buttonClassName}
      >
        {loading
          ? "Creating payment link…"
          : paymentUrl
            ? "Open Revolut payment"
            : "Create Revolut payment"}
      </button>

      {error ? (
        <p className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}