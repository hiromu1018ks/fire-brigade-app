"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SignInPage() {
  // フォームの状態管理
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })
  const [isLoading, setIsLoading] = useState(false) // ローディング状態
  const [error, setError] = useState("") // エラーメッセージ

  const router = useRouter()

  // 入力値の変更処理
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    // エラーメッセージをクリア
    if (error) setError("")
  }

  // ログイン処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // NextAuth.js のサインイン関数を呼び出し
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false, // 自動リダイレクトを無効化
      })

      if (result?.error) {
        // ログイン失敗時のエラーハンドリング
        setError("メールアドレスまたはパスワードが正しくありません")
      } else if (result?.ok) {
        // ログイン成功時の処理
        console.log("ログイン成功")
        
        // セッション情報を取得
        const session = await getSession()
        console.log("セッション情報:", session)

        // ダッシュボードにリダイレクト
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("ログインエラー:", error)
      setError("ログイン処理中にエラーが発生しました")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">消防団ログイン</CardTitle>
          <CardDescription>
            認証情報を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* エラーメッセージの表示 */}
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                {error}
              </div>
            )}

            {/* メールアドレス入力 */}
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* パスワード入力 */}
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* ログインボタン */}
            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>

          {/* テスト用の情報 */}
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