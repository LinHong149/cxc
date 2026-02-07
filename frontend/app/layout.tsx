import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Timeline Detective Board",
  description: "Document Entity Graph Explorer - Transform documents into interactive investigation boards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
