import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CFG Taxi Demo",
  description:
    "Ask natural-language analytics questions over the NYC taxi ClickHouse dataset.",
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
