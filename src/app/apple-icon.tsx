import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 36,
          background:
            "radial-gradient(circle at top, rgba(208,216,43,0.35), transparent 30%), linear-gradient(180deg, #15191a 0%, #0b0d0e 100%)",
          color: "#d0d82b",
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: "-0.08em",
        }}
      >
        PT
      </div>
    ),
    size,
  );
}
