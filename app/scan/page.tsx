"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ScanPage() {
  const router = useRouter();
  const scannerRef = useRef<any>(null);
  const startedRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    // Prevent double start in React strict mode
    if (startedRef.current) return;
    startedRef.current = true;

    async function startScanner() {
      setError(null);

      try {
        const mod = await import("html5-qrcode");
        const Html5QrcodeScanner = (mod as any).Html5QrcodeScanner;

        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 260, height: 260 },
            rememberLastUsedCamera: true,
          },
          false
        );

        scannerRef.current = scanner;

        scanner.render(
          (decodedText: string) => {
            const text = decodedText.trim();

            // 🔔 HAPTIC FEEDBACK (phone only)
            if ("vibrate" in navigator) {
              navigator.vibrate(120);
            }

            // 🟢 Green border flash
            setFlash(true);
            setTimeout(() => setFlash(false), 300);

            // Stop scanning immediately after success
            try {
              scanner.clear();
            } catch {
              /* ignore */
            }

            // Full URL in QR → go there
            if (text.startsWith("http://") || text.startsWith("https://")) {
              window.location.href = text;
              return;
            }

            // BOX-001 → go to box page
            if (/^BOX-\d{3}$/i.test(text)) {
              router.push(`/box/${encodeURIComponent(text.toUpperCase())}`);
              return;
            }

            // Relative path like /box/BOX-001
            if (text.startsWith("/")) {
              router.push(text);
              return;
            }

            setError(`QR not recognised: ${text}`);
          },
          () => {
            // ignore scan errors while camera is searching
          }
        );
      } catch (e: any) {
        setError(
          e?.message ||
            "Unable to start camera. Check browser permissions."
        );
      }
    }

    startScanner();

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch {
          /* ignore */
        }
      }
    };
  }, [router]);

  return (
    <main style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>Scan QR</h1>
      <p>Point your camera at a box QR code.</p>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      <div
        id="qr-reader"
        style={{
          width: "100%",
          maxWidth: 420,
          minHeight: 380,
          borderRadius: 12,
          overflow: "hidden",
          background: "#fff",
          border: flash ? "4px solid #22c55e" : "2px solid #444",
          transition: "border 0.2s ease",
        }}
      />
    </main>
  );
}
