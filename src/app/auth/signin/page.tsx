"use client"

import { useState } from "react"
import { getSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// 消防団のログインページを表示するメインコンポーネント
export default function SignInPage() {
  // フォームの入力データを管理するための状態
  // email: メールアドレスの入力値を保持
  // password: パスワードの入力値を保持
  const [ formData, setFormData ] = useState({
    email : "",
    password : ""
  })

  // ログイン処理中かどうかを示すローディング状態
  // true: ログイン処理中でボタンや入力フィールドを無効化
  // false: 通常状態で入力・送信が可能
  const [ isLoading, setIsLoading ] = useState(false)

  // エラーメッセージを保持する状態
  // 空文字列: エラーなし、文字列: エラーメッセージを表示
  const [ error, setError ] = useState("")

  // Next.jsのルーターオブジェクト（ページ遷移に使用）
  const router = useRouter()

  // フォームの入力値が変更された時の処理関数
  // field: 変更されたフィールド名（"email" または "password"）
  // value: 新しい入力値
  const handleInputChange = (field : string, value : string) => {
    // 既存のformDataを保持しつつ、指定されたフィールドのみを更新
    setFormData(prev => ( {
      ...prev, // 既存のデータをスプレッド演算子で展開
      [field] : value // 動的なプロパティ名で値を設定
    } ))

    // ユーザーが入力を開始したらエラーメッセージをクリア
    // エラーが表示されている場合のみクリアを実行
    if ( error ) setError("")
  }

  // フォーム送信時のログイン処理を行う非同期関数
  const handleSubmit = async (e : React.FormEvent) => {
    // デフォルトのフォーム送信動作（ページリロード）を防止
    e.preventDefault()

    // ログイン処理開始時の状態設定
    setIsLoading(true) // ローディング状態を有効化
    setError("") // 既存のエラーメッセージをクリア

    try {
      // NextAuth.jsのsignIn関数を使用してログイン認証を実行
      const result = await signIn("credentials", {
        email : formData.email, // 入力されたメールアドレス
        password : formData.password, // 入力されたパスワード
        redirect : false, // 認証後の自動リダイレクトを無効化（手動制御するため）
      })

      // ログイン結果の判定とエラーハンドリング
      if ( result?.error ) {
        // 認証失敗時の処理
        // サーバーから返されたエラーをユーザーフレンドリーなメッセージに変換
        setError("メールアドレスまたはパスワードが正しくありません")
      } else if ( result?.ok ) {
        // 認証成功時の処理
        console.log("ログイン成功") // デバッグ用ログ出力

        // 最新のセッション情報をサーバーから取得
        // ユーザー情報やトークンなどが含まれる
        const session = await getSession()
        console.log("セッション情報:", session) // デバッグ用セッション情報出力

        // ログイン成功後にダッシュボードページへリダイレクト
        router.push("/dashboard")
      }
    } catch ( error ) {
      // try-catch文で捕捉されたエラーの処理
      // ネットワークエラーやその他の予期しないエラーを処理
      console.error("ログインエラー:", error) // デバッグ用エラーログ出力
      setError("ログイン処理中にエラーが発生しました") // ユーザー向けエラーメッセージ
    } finally {
      // 成功・失敗に関わらず必ず実行される処理
      // ローディング状態を解除してUIを操作可能にする
      setIsLoading(false)
    }
  }

  // JSXを返すrender部分
  return (
    /* 画面全体のコンテナ - 画面いっぱいの高さで中央配置 */
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {/* ログインフォームを包むカードコンポーネント */ }
      <Card className="w-full max-w-md">
        {/* カードのヘッダー部分 - タイトルと説明を中央配置で表示 */ }
        <CardHeader className="text-center">
          {/* メインタイトル - 大きな文字でログインページであることを示す */ }
          <CardTitle className="text-2xl">消防団ログイン</CardTitle>
          {/* サブタイトル - ユーザーに何をすべきかを説明 */ }
          <CardDescription>
            認証情報を入力してください
          </CardDescription>
        </CardHeader>

        {/* カードのコンテンツ部分 - 実際のフォームを含む */ }
        <CardContent>
          {/* ログインフォーム - 送信時にhandleSubmitを実行 */ }
          <form onSubmit={ handleSubmit } className="space-y-4">
            {/* エラーメッセージの条件付き表示 */ }
            {/* errorが存在する場合のみ赤い背景のエラーメッセージを表示 */ }
            { error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                { error }
              </div>
            ) }

            {/* メールアドレス入力フィールドのセクション */ }
            <div className="space-y-2">
              {/* メールアドレス入力のラベル - アクセシビリティのためhtmlForで関連付け */ }
              <Label htmlFor="email">メールアドレス</Label>
              {/* メールアドレス入力フィールド */ }
              <Input
                id="email" // ラベルとの関連付けID
                type="email" // HTML5のメール検証を有効化
                required // フォーム送信時の必須検証
                value={ formData.email } // React制御下での値の管理
                onChange={ (e) => handleInputChange("email", e.target.value) } // 入力変更時のハンドラー
                disabled={ isLoading } // ローディング中は入力を無効化
              />
            </div>

            {/* パスワード入力フィールドのセクション */ }
            <div className="space-y-2">
              {/* パスワード入力のラベル - アクセシビリティのためhtmlForで関連付け */ }
              <Label htmlFor="password">パスワード</Label>
              {/* パスワード入力フィールド */ }
              <Input
                id="password" // ラベルとの関連付けID
                type="password" // 入力内容を隠すパスワードタイプ
                required // フォーム送信時の必須検証
                value={ formData.password } // React制御下での値の管理
                onChange={ (e) => handleInputChange("password", e.target.value) } // 入力変更時のハンドラー
                disabled={ isLoading } // ローディング中は入力を無効化
              />
            </div>

            {/* ログイン実行ボタン */ }
            <Button
              type="submit" // フォーム送信ボタンとして動作
              className="w-full" // ボタンを横幅いっぱいに表示
              disabled={ isLoading } // ローディング中はボタンを無効化して二重送信を防止
            >
              {/* ローディング状態によってボタンテキストを動的に変更 */ }
              {/* ローディング中: "ログイン中..."、通常時: "ログイン" */ }
              { isLoading ? "ログイン中..." : "ログイン" }
            </Button>
          </form>

          {/* 開発・テスト用の認証情報表示エリア */ }
          {/* 本番環境では削除することが推奨される */ }
          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
            <p className="font-medium">テスト用認証情報:</p>
            <p>メール: test@example.com</p>
            <p>パスワード: password123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}