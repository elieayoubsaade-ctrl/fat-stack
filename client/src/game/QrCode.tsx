/**
 * A QR code drawn as inline SVG.
 *
 * Rendered locally rather than fetched from a QR image service — the cabinet has to
 * keep working when the venue wi-fi doesn't, and a claim QR that fails to load is a
 * lost customer record.
 */
import { useMemo } from "react";
import qrcode from "qrcode-generator";

export default function QrCode({ value, size = 220 }: { value: string; size?: number }) {
  const path = useMemo(() => {
    // Type 0 = auto-fit; level "M" survives a slightly dirty or angled phone scan.
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let d = "";
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`;
      }
    }
    return { d, count };
  }, [value]);

  return (
    <svg
      className="qr-code"
      width={size}
      height={size}
      viewBox={`-1 -1 ${path.count + 2} ${path.count + 2}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Scan to claim your place on the leaderboard"
    >
      <rect x={-1} y={-1} width={path.count + 2} height={path.count + 2} fill="#ffffff" />
      <path d={path.d} fill="#1c1720" />
    </svg>
  );
}
