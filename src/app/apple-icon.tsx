import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Rendered from the same house mark as icon.svg — no rasterizer dependency needed. */
export default function AppleIcon() {
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
          padding: "22px",
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 16 16" fill="#FFF8EE">
          <path d="M8 1.5 1 7.5V14.5H6V10H10V14.5H15V7.5L8 1.5Z" />
        </svg>
      </div>
    ),
    size,
  );
}
