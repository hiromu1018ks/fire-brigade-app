// NextAuth.js v5 でのハンドラーをインポート
// handlers は NextAuth の設定から生成された HTTP リクエストハンドラー
import { handlers } from "@/lib/auth";

// Next.js の App Router では、API ルートで HTTP メソッドごとに名前付きエクスポートが必要
// GET リクエスト：セッション情報の取得、認証ページの表示などに使用される
// POST リクエスト：ログイン処理、ログアウト処理、CSRF トークンの検証などに使用される
// NextAuth v5 では handlers オブジェクトから GET と POST を直接エクスポートする
export const { GET, POST } = handlers