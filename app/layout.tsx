import React from "react";
import "./globals.css";
import Providers from "./providers";      // Import Providers component

export const metadata = {
  title: "ZigAI – trợ lý dạy Python cho học sinh THPT tại Việt Nam",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        {/* Bọc toàn bộ app trong Providers (client) */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
