'use client'

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function TestComponentPage() {
  const [ formData, setFormData ] = useState({
    name : '',
    email : '',
  })

  const handleSubmit = (e : React.FormEvent) => {
    e.preventDefault()
    console.log("送信されたデータ：", formData)
    alert(`送信されました: ${ formData.name } (${ formData.email })`)
  }

  const handleInputChange = (field : string, value : string) => {
    setFormData(prev => ( {
      ...prev,
      [field] : value
    } ))
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">
        UIコンポーネントテスト
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>ボタンコンポーネント</CardTitle>
          <CardDescription>様々なスタイルのボタンをテストします</CardDescription>
        </CardHeader>
        <CardContent className="space-x-2">
          <Button variant="default">デフォルト</Button>
          <Button variant="secondary">セカンダリ</Button>
          <Button variant="destructive">危険</Button>
          <Button variant="outline">アウトライン</Button>
          <Button variant="ghost">ゴースト</Button>
        </CardContent>
      </Card>

      {/* フォームのテスト */ }
      <Card>
        <CardHeader>
          <CardTitle>フォームコンポーネント</CardTitle>
          <CardDescription>
            入力フィールドとラベルのテストフォームです
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={ handleSubmit } className="space-y-4">
            {/* 名前入力フィールド */ }
            <div className="space-y-2">
              <Label htmlFor="name">氏名</Label>
              <Input
                id="name"
                type="text"
                placeholder="山田太郎"
                value={ formData.name }
                onChange={ e => handleInputChange('name', e.target.value) }
              />
            </div>

            {/* メールアドレス入力フィールド */ }
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="yamada@example.com"
                value={ formData.email }
                onChange={ (e) => handleInputChange('email', e.target.value) }
              />
            </div>

            {/* 送信ボタン */ }
            <Button type="submit" className="w-full">
              送信
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 現在の入力値を表示 */ }
      <Card>
        <CardHeader>
          <CardTitle>入力状態</CardTitle>
          <CardDescription>
            リアルタイムで入力値を表示します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded">
            { JSON.stringify(formData, null, 2) }
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}