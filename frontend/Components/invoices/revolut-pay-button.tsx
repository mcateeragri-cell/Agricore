"use client";

import { useEffect, useState } from "react";
import type { CreatePaymentLinkResponse } from "@/lib/payments/types";

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
  const [paymentUrl, setPaymentUrl] = useState(existingPaymentUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPaymentUrl(existingPaymentUrl ?? "");
  }, [existingPaymentUrl]);

  async function handleClick() {
    if (disabled || loading) {
      return;
    }

    setError("");

    if (paymentUrl) {
      window.open(paymentUrl, "_blank", "noopener,noreferrer");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/payments/revolut/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          invoiceId,
        }),
      });

      const contentType = response.headers.get("content-type") ?? "";
      const responseText = await response.text();

      if (!contentType.includes("application/json")) {
        console.error("Non-JSON Revolut API response:", {
          status: response.status,
          url: response.url,
          redirected: response.redirected,
          contentType,
          responseText: responseText.slice(0, 500),
        });

        if (
          response.redirected ||
          response.url.includes("/login") ||
          responseText.includes("<!DOCTYPE")
        ) {
          throw new Error(
            "The payment request was redirected to an HTML page. Please sign in again, then retry.",
          );
        }

        throw new Error(
          `The payment service returned an unexpected response (${response.status}). Check the Vercel runtime logs.`,
        );
      }

      let body: CreatePaymentLinkResponse;

      try {
        body = JSON.parse(responseText) as CreatePaymentLinkResponse;
      } catch {
        throw new Error(
          `The payment service returned invalid JSON (${response.status}).`,
        );
      }

      if (!response.ok || !body.success || !body.paymentUrl) {
        throw new Error(
          body.error ?? "Unable to create the Revolut payment link.",
        );
      }

      setPaymentUrl(body.paymentUrl);
      onCreated?.(body.paymentUrl);

      window.open(body.paymentUrl, "_blank", "noopener,noreferrer");
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
        onClick={() => void handleClick()}
        className={buttonClassName}
      >
        {loading
          ? "Creating payment link…"
          : paymentUrl
            ? "Open Revolut payment"
            : "Create Revolut payment"}
      </button>

      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}