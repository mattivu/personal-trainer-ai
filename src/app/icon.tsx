import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at top, rgba(208,216,43,0.35), transparent 32%), linear-gradient(180deg, #101415 0%, #0a0d0d 100%)",
          color: "#d0d82b",
          fontSize: 210,
          fontWeight: 700,
          letterSpacing: "-0.08em",
        }}
      >
        PTAI
      </div>
    ),
    size,
  );
}
