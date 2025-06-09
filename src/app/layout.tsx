import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import React from "react";

const inter = Inter({ subsets : [ 'latin' ] })

export const metadata : Metadata = {
  title : "hi-keshi app",
  description : "地域消防団の業務効率化を支援するアプリケーション",
};

export default function RootLayout({
                                     children,
                                   } : Readonly<{
  children : React.ReactNode;
}>) {
  return (
    <html lang="ja">
    <body
      className={ inter.className }>
    { children }
    </body>
    </html>
  );
}
