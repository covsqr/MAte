import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MAte - AI Partner",
  description: "당신만의 가상 공간 속 연인",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import BackgroundPoller from "@/components/BackgroundPoller";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <BackgroundPoller />
        <div style={{
          width: "100%",
          maxWidth: "var(--app-max-width)",
          minHeight: "100vh",
          backgroundColor: "var(--kakao-bg)",
          boxShadow: "0 0 20px rgba(0,0,0,0.1)",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}>
          {children}
        </div>
      </body>
    </html>
  );
}
