import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Threshold — A calm first step",
  description: "A simple, private first step to share what children need tonight.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
