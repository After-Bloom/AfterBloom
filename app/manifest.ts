import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AfterBloom",
    short_name: "AfterBloom",
    description: "A postpartum care platform for Indian mothers, their families and their babies",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFF8F3",
    theme_color: "#B04A56",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Need help now", short_name: "Help", url: "/crisis" },
      { name: "Daily check-in", short_name: "Check-in", url: "/checkin" },
      { name: "Symptom checker", short_name: "Symptoms", url: "/check" },
    ],
  };
}
