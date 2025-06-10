"use client"

// React及びNext.jsの認証機能をインポート
import React from "react";
import { SessionProvider } from "next-auth/react";

// アプリケーション全体に認証機能を提供するプロバイダーコンポーネント
export function Providers({ children } : { children : React.ReactNode }) {
  return (
    // SessionProviderは認証セッション情報をコンポーネントツリー全体で共有するためのコンテキストプロバイダー
    // 子コンポーネントから useSession フックでセッション情報にアクセス可能になる
    <SessionProvider>
      {/* 
        children プロパティで受け取った子コンポーネントをレンダリング
        これにより子コンポーネント全てが認証機能を利用できるようになる 
      */ }
      { children }
    </SessionProvider>
  )
}