import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studio Portal",
  description: "Client project portal — The Scaler Studio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
