import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VC Associate - AI Pipeline",
  description: "Multi-modal AI-based VC associate for processing investment opportunities",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Prevent zoom on input focus on iOS
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
