import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DriverTeam",
    short_name: "DriverTeam",
    description: "Reservas, clientes y finanzas para choferes",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f6f5f1",
    theme_color: "#f6f5f1",
    lang: "es",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
