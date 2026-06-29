import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Personal Trainer AI",
    short_name: "Trainer AI",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0a0d0d",
    theme_color: "#d0d82b",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
