import { ImageResponse } from "next/og";

/**
 * PWA icons as real PNGs (Chrome requires 192px + 512px; iOS home screen
 * only accepts PNG). Rendered from the same mark as icon.svg via next/og —
 * avoids adding a rasterizer (sharp) just for a couple of static images.
 * Used by src/app/manifest.ts.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

const SIZES = ["192", "512"] as const;

export function generateStaticParams() {
  return SIZES.map((size) => ({ size }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const px = SIZES.includes(size as (typeof SIZES)[number]) ? Number(size) : 192;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#C1652D",
          padding: `${px * 0.14}px`,
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 16 16" fill="#FFF8EE">
          <path d="M8 1.5 1 7.5V14.5H6V10H10V14.5H15V7.5L8 1.5Z" />
        </svg>
      </div>
    ),
    { width: px, height: px },
  );
}
