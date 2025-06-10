# フェーズ1実装チュートリアル: 基盤整備

## 📋 このフェーズで学ぶこと

このチュートリアルでは、消防団アプリの基盤となる以下の機能を実装します：

1. **Prisma ORM** を使ったデータベース接続
2. **shadcn/ui** を使った基本UIコンポーネント
3. **NextAuth.js** を使った認証機能

各ステップは段階的に進められるよう設計されており、コードの動作確認を行いながら学習できます。

---

## ステップ1.1: Prisma ORM の設定とデータベース接続

### 🎯 目標
PostgreSQLデータベースとの接続を確立し、消防団員の基本情報を管理できるデータベーススキーマを作成する

### 📚 学習内容
- Prisma ORM の基本概念
- データベーススキーマの設計
- マイグレーションの実行方法

### 🛠️ 実装手順

#### 1-1-1. Prismaのインストール

**何をするか**: Prisma ORMをプロジェクトに追加します。

**ORMとは**: Object-Relational Mapping（オブジェクト関係マッピング）の略で、データベースのテーブルをJavaScriptのオブジェクトとして扱えるようにするツールです。

**なぜPrismaを使うのか**:
- SQLを直接書かなくても、TypeScriptのコードでデータベース操作ができる
- 型安全性があり、間違ったデータ操作を防げる
- データベーススキーマの変更を安全に管理できる

```bash
# Prisma CLI と Prisma Client をインストール
npm install prisma @prisma/client
```

**インストールされるパッケージの詳細**:
- `prisma`: 
  - データベーススキーマの管理用CLI（コマンドラインツール）
  - マイグレーション（DB構造変更）の実行
  - データベースとの同期作業
- `@prisma/client`: 
  - アプリケーションコードからデータベースにアクセスするためのライブラリ
  - TypeScript型定義も自動生成される

#### 1-1-2. Prismaの初期化

**何をするか**: プロジェクトにPrismaの設定ファイルを作成します。

**npxとは**: Node.jsのパッケージを一時的にダウンロードして実行するコマンドです。ローカルにインストールしなくても最新版のツールを使用できます。

```bash
# Prismaプロジェクトを初期化（prismaフォルダとschema.prismaファイルが作成される）
npx prisma init
```

**この コマンドが行う処理**:
1. `prisma/` フォルダの作成
2. `prisma/schema.prisma` ファイルの作成（データベーススキーマ定義用）
3. `.env` ファイルの作成または更新（環境変数設定用）

**実行後の確認ポイント**:
- `prisma/schema.prisma` ファイルが作成されている
  → データベースの構造（テーブル、カラム等）を定義するファイル
- `.env` ファイルが作成されている（または既存の場合は `DATABASE_URL` が追加されている）
  → データベース接続情報などの機密情報を保存するファイル

**成功時の出力例**:
```
✔ Your Prisma schema was created at prisma/schema.prisma
  You can now open it in your favorite editor.
```

#### 1-1-3. 環境変数の設定

**何をするか**: データベース接続情報や認証に必要な秘密鍵を設定します。

**環境変数とは**: アプリケーションが実行時に参照する設定値のことです。機密情報（パスワード、APIキー等）をコードに直接書かずに、外部ファイルで管理できます。

**なぜ環境変数を使うのか**:
- 機密情報をGitにコミットせずに済む
- 開発環境と本番環境で異なる設定を使える
- セキュリティリスクを減らせる

プロジェクトルートに `.env.local` ファイルを作成し、データベース接続情報を設定します：

```bash
# .env.local ファイルを作成
touch .env.local
```

**touchコマンドの説明**: 新しい空ファイルを作成するLinux/macOSコマンドです。Windowsの場合は `type nul > .env.local` を使用。

`.env.local` の内容：

```env
# データベース接続URL（docker-compose.ymlの設定と一致させる）
DATABASE_URL="postgresql://fire_brigade_user:password123@localhost:5432/fire_brigade"

# NextAuth.jsで使用する秘密鍵（ランダムな文字列を生成）
NEXTAUTH_SECRET="your-secret-key-here"

# アプリケーションのベースURL
NEXTAUTH_URL="http://localhost:3000"
```

**各環境変数の詳細説明**:

1. **DATABASE_URL**: 
   - PostgreSQLデータベースへの接続文字列
   - 形式: `postgresql://ユーザー名:パスワード@ホスト:ポート/データベース名`
   - `docker-compose.yml` の設定と一致させる必要がある

2. **NEXTAUTH_SECRET**: 
   - NextAuth.jsがJWTトークンの暗号化に使用する秘密鍵
   - ランダムで推測困難な文字列にする必要がある
   - 本番環境では必ず変更すること

3. **NEXTAUTH_URL**: 
   - アプリケーションのベースURL
   - 認証フロー（リダイレクト等）で使用される

**重要なセキュリティ注意点**:
- `.env.local` は `.gitignore` に含まれており、Gitで管理されません
- 機密情報なので、絶対にGitHubなどに公開しないこと
- `NEXTAUTH_SECRET` は本番環境では必ず安全な文字列に変更してください
- パスワードは複雑なものを使用すること

#### 1-1-4. データベーススキーマの定義

**何をするか**: データベースのテーブル構造を定義します。

**データベーススキーマとは**: データベースの設計図のことです。どのようなテーブルがあり、各テーブルにどのような項目（カラム）があるかを定義します。

**消防団アプリで必要なテーブル**:
1. **User（ユーザー）**: 消防団員の基本情報
2. **Group（班）**: 消防団内の組織単位
3. **Area（地域）**: 各班が担当する地理的エリア
4. **Role（列挙型）**: 団員の役職

`prisma/schema.prisma` ファイルを以下の内容で更新します：

```prisma
// Prismaクライアントの設定
generator client {
  provider = "prisma-client-js"  // JavaScript/TypeScript用のクライアントを生成
}

// データベース接続の設定
datasource db {
  provider = "postgresql"        // PostgreSQLを使用
  url      = env("DATABASE_URL") // .env.localで設定したURLを参照
}

// 消防団員のユーザー情報を管理するメインテーブル
// 各消防団員の基本情報と認証情報を一元管理する
model User {
  id          String   @id @default(cuid())  // プライマリキー: 一意のユーザーID（自動生成される短いランダム文字列）
  email       String   @unique               // ログイン用メールアドレス（システム全体で重複不可）
  name        String                         // 消防団員の氏名（必須項目）
  phoneNumber String?                        // 緊急連絡用電話番号（任意項目、nullの場合もある）
  role        Role     @default(MEMBER)      // ユーザーの役職（列挙型、デフォルトは一般団員）
  groupId     String?                        // 所属班のID（班に未所属の場合はnull）
  joinDate    DateTime @default(now())       // 消防団入団日（レコード作成時の日時が自動設定）
  isActive    Boolean  @default(true)        // アカウントのアクティブ状態（false=退団済み、true=現役）
  createdAt   DateTime @default(now())       // データベースレコードの作成日時（自動設定）
  updatedAt   DateTime @updatedAt            // データベースレコードの最終更新日時（更新時に自動設定）

  // 他のテーブルとのリレーション（関連付け）設定
  group Group? @relation(fields: [groupId], references: [id]) // 所属班との多対一リレーション（一人のユーザーは一つの班に所属）
  
  // 将来的に追加予定の機能用コメント（現在は未実装）
  // emergencyResponses EmergencyResponse[] // 出動対応記録
  // scheduleAttendances ScheduleAttendance[] // スケジュール出席記録

  @@map("users") // データベース内でのテーブル名を指定（Prismaのモデル名とは異なる名前を使用可能）
}

// 班の情報を管理するテーブル
model Group {
  id          String   @id @default(cuid())  // 一意のID（自動生成）
  name        String   @unique               // 班名（例：「A分団A班」）
  description String?                        // 班の説明（任意）
  isActive    Boolean  @default(true)        // アクティブ状態
  createdAt   DateTime @default(now())       // レコード作成日時
  updatedAt   DateTime @updatedAt            // レコード更新日時

  // リレーション
  members     User[]                         // 班に所属する団員（一対多の関係）
  areas       Area[]                         // 班が担当する地域（一対多の関係）

  // 将来的に追加予定のリレーション用のコメント
  // emergencies Emergency[] // この班が担当する出動

  @@map("groups") // データベース内でのテーブル名
}

// 担当地域の情報を管理するテーブル
model Area {
  id          String   @id @default(cuid())  // 一意のID（自動生成）
  name        String                         // 地域名（例：「A地区」）
  description String?                        // 地域の詳細説明（任意）
  groupId     String                         // 担当班ID
  isActive    Boolean  @default(true)        // アクティブ状態
  createdAt   DateTime @default(now())       // レコード作成日時
  updatedAt   DateTime @updatedAt            // レコード更新日時

  // リレーション
  group       Group    @relation(fields: [groupId], references: [id]) // 担当班

  // 将来的に追加予定のリレーション用のコメント
  // emergencies Emergency[] // この地域で発生した出動

  @@map("areas") // データベース内でのテーブル名
}

// 消防団内の役職を定義する列挙型
enum Role {
  ADMIN      // 管理者（分団長など）
  LEADER     // 班長
  OFFICER    // 幹部（副分団長、副班長など）
  MEMBER     // 一般団員
}
```

**重要なPrisma記法の詳細解説**:

1. **プライマリキー・一意制約**:
   - `@id`: 主キー（テーブルの各行を一意に識別する項目）
   - `@unique`: 重複を許可しない制約（例：メールアドレス）
   - `@default(cuid())`: 自動生成される短いランダムID

2. **データ型とオプション**:
   - `String`: 文字列型（必須）
   - `String?`: 文字列型（任意、nullを許可）
   - `DateTime`: 日時型
   - `Boolean`: 真偽値型（true/false）

3. **自動値設定**:
   - `@default(now())`: レコード作成時に現在日時を自動設定
   - `@updatedAt`: レコード更新時に現在日時を自動設定

4. **テーブル間の関係（リレーション）**:
   - `User` ↔ `Group`: 多対一（多数のユーザーが一つの班に所属）
   - `Group` ↔ `Area`: 一対多（一つの班が複数の地域を担当）
   - `@relation(fields: [groupId], references: [id])`: 外部キー制約の定義

5. **テーブル名の設定**:
   - `@@map("users")`: データベース内でのテーブル名を指定
   - Prismaのモデル名（User）とDB内テーブル名（users）を分けることができる

6. **列挙型（Enum）**:
   - あらかじめ定義された値のみを許可する型
   - 例：Role enum で ADMIN, LEADER, OFFICER, MEMBER のみ許可

#### 1-1-5. データベースの起動

**何をするか**: PostgreSQLデータベースをDockerコンテナで起動します。

**Dockerとは**: アプリケーションを軽量な仮想環境（コンテナ）で実行するツールです。ローカル環境にPostgreSQLを直接インストールしなくても、簡単にデータベースを利用できます。

**docker-composeとは**: 複数のDockerコンテナを連携して管理するツールです。設定ファイル（docker-compose.yml）に基づいて、必要なサービスを一括で起動できます。

```bash
# PostgreSQLコンテナを起動
docker-compose up -d postgres
```

**コマンドの詳細説明**:
- `docker-compose up`: docker-compose.ymlの設定に基づいてサービスを起動
- `-d`: バックグラウンドで実行（detached モード）
- `postgres`: 起動するサービス名（docker-compose.ymlで定義されたサービス）

**起動確認方法**:
```bash
# コンテナが起動しているか確認
docker-compose ps
```

**正常起動時の出力例**:
```
       Name                     Command              State           Ports         
------------------------------------------------------------------------------------
project_postgres_1   docker-entrypoint.sh postgres   Up      0.0.0.0:5432->5432/tcp
```

**もしエラーが発生した場合**:
```bash
# ログを確認
docker-compose logs postgres

# コンテナを停止して再起動
docker-compose down
docker-compose up -d postgres
```

#### 1-1-6. 初回マイグレーションの実行

**何をするか**: 定義したPrismaスキーマを実際のデータベースに反映させます。

**マイグレーションとは**: データベースの構造変更（テーブル作成、カラム追加等）を管理する仕組みです。変更履歴を記録し、チーム間でのデータベース構造の同期を可能にします。

**なぜマイグレーションが必要か**:
- データベースの変更を安全に管理できる
- チームメンバー全員が同じDB構造で開発できる
- 本番環境への適用も安全に行える
- 変更履歴が残るため、問題が発生した時に戻せる

```bash
# データベースにテーブルを作成（初回マイグレーション）
npx prisma migrate dev --name init
```

**コマンドの詳細説明**:
- `npx prisma migrate dev`: 開発環境用のマイグレーション実行
- `--name init`: マイグレーションファイルに付ける名前（初回なので"init"）

**実行される処理の詳細**:
1. **データベース接続の確認**: .env.localのDATABASE_URLを使って接続テスト
2. **スキーマ比較**: 現在のスキーマとDBの差分を検出
3. **SQLファイルの生成**: 差分を解消するSQLコードを自動生成
4. **マイグレーションファイルの作成**: `prisma/migrations/` フォルダに保存
5. **データベースへの適用**: 生成されたSQLを実際に実行
6. **Prismaクライアントの自動生成**: TypeScript型定義を含む

**成功時の出力例**:
```
Environment variables loaded from .env.local
Prisma schema loaded from prisma/schema.prisma

Datasource "db": PostgreSQL database "fire_brigade", schema "public" at "localhost:5432"

✔ Generated Prisma Client (v5.x.x) to ./node_modules/@prisma/client in 150ms

Your database is now in sync with your schema.

✔ Generated Prisma Client (version) to ./node_modules/@prisma/client
```

**作成されるファイル**:
- `prisma/migrations/yyyymmddhhmmss_init/migration.sql`: 実際に実行されたSQLファイル
- `node_modules/@prisma/client/`: TypeScript型定義を含むクライアントライブラリ

#### 1-1-7. Prismaクライアントのセットアップ

**何をするか**: アプリケーションコードからデータベースにアクセスするためのPrismaクライアントを設定します。

**Prismaクライアントとは**: データベース操作を行うためのJavaScript/TypeScriptライブラリです。SQLを書かずに、オブジェクト指向的にデータベース操作ができます。

**なぜ専用設定ファイルが必要か**:
- Next.jsの開発環境でのホットリロード時に複数のインスタンスが作成されることを防ぐ
- アプリケーション全体で単一のPrismaインスタンスを共有する
- 開発時のデバッグ用設定を追加する

`src/lib/prisma.ts` ファイルを作成し、Prismaクライアントのインスタンスを設定：

```typescript
// src/lib/prisma.ts

// PrismaClientをインポート
import { PrismaClient } from '@prisma/client'

// グローバル変数の型定義（開発環境でのホットリロード対応）
// Next.jsの開発環境では、ファイル変更時にモジュールが再読み込みされるため、
// 毎回新しいPrismaClientインスタンスが作成されてしまう問題を防ぐ
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prismaクライアントのインスタンスを作成
// 開発環境では既存のインスタンスを再利用してパフォーマンスを向上
export const prisma =
  globalForPrisma.prisma ??  // 既存のインスタンスがある場合はそれを使用
  new PrismaClient({
    log: ['query'], // 実行されるSQLクエリをコンソールに出力（開発時のデバッグ用）
  })

// 開発環境でのホットリロード時にインスタンスをグローバルに保持
// 本番環境では不要（NODE_ENV が 'production' の場合は実行しない）
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**コードの詳細解説**:

1. **グローバル変数の活用**:
   - `globalThis`: JavaScript の標準的なグローバルオブジェクト
   - 開発環境でのホットリロード時にPrismaインスタンスを保持

2. **Null合体演算子（??）**:
   - `globalForPrisma.prisma ?? new PrismaClient()` の意味：
   - 左側が null または undefined の場合のみ右側を実行
   - 既存インスタンスがあれば再利用、なければ新規作成

3. **ログ設定**:
   - `log: ['query']`: 実行されるSQLクエリをコンソールに表示
   - 開発時のデバッグに便利（どんなSQLが実行されているか確認できる）
   - 本番環境では通常無効にする

4. **環境による条件分岐**:
   - `process.env.NODE_ENV !== 'production'`: 開発環境のみで実行
   - 本番環境ではグローバル変数への保存は不要

#### 1-1-8. 動作確認用のAPIルートの作成

**何をするか**: データベース接続が正常に動作するかテストするためのAPIエンドポイントを作成します。

**APIルートとは**: Next.jsのApp Routerで、`/api/` で始まるURLにアクセスしたときに実行されるサーバーサイドのコードです。

**なぜテスト用APIが必要か**:
- データベース接続が正常に動作するか確認
- Prismaクライアントが正しく設定されているか検証
- 実際のデータベース操作（作成・取得）をテスト
- 問題が発生した場合の切り分けに使用

**作成するAPI**:
- `GET /api/test-db`: データベース接続テスト（ユーザー数の取得）
- `POST /api/test-db`: テストユーザーの作成

`src/app/api/test-db/route.ts` ファイルを作成してデータベース接続をテスト：

```typescript
// src/app/api/test-db/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET リクエストのハンドラー（データベース接続テスト用）
export async function GET(request: NextRequest) {
  try {
    // データベースに接続してユーザー数を取得
    const userCount = await prisma.user.count()
    
    // 成功レスポンスを返す
    return NextResponse.json({ 
      message: 'データベース接続成功', 
      userCount,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    // エラーハンドリング
    console.error('データベース接続エラー:', error)
    return NextResponse.json(
      { error: 'データベース接続に失敗しました' },
      { status: 500 }
    )
  }
}

// POST リクエストのハンドラー（テストユーザー作成用）
export async function POST(request: NextRequest) {
  try {
    // リクエストボディからデータを取得
    const body = await request.json()
    const { name, email, role, groupId } = body

    // 新しいユーザーをデータベースに作成
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role: role || 'MEMBER', // デフォルトは一般団員
        groupId: groupId || null, // 班IDが指定されていない場合はnull
      },
      include: {
        group: true, // 関連する班情報も一緒に取得
      }
    })

    // 作成されたユーザー情報を返す
    return NextResponse.json({ 
      message: 'ユーザー作成成功', 
      user: newUser 
    })
  } catch (error) {
    console.error('ユーザー作成エラー:', error)
    return NextResponse.json(
      { error: 'ユーザー作成に失敗しました' },
      { status: 500 }
    )
  }
}
```

#### 1-1-9. 動作確認

開発サーバーを起動してテスト：

```bash
# 開発サーバーを起動
npm run dev
```

ブラウザで以下のURLにアクセス：
- `http://localhost:3000/api/test-db` - データベース接続テスト

**期待される結果**:
```json
{
  "message": "データベース接続成功",
  "userCount": 0,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## ステップ1.2: shadcn/ui による基本UIコンポーネントの作成

### 🎯 目標
再利用可能なUIコンポーネントライブラリを導入し、統一感のあるデザインシステムを構築する

### 📚 学習内容
- shadcn/ui の基本概念
- コンポーネントライブラリの活用方法
- Tailwind CSS との連携

### 🛠️ 実装手順

#### 1-2-1. 基本コンポーネントのインストール

```bash
# 基本的なUIコンポーネントをインストール
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add form
npx shadcn@latest add label
npx shadcn@latest add toast
```

**インストール後の確認**:
- `src/components/ui/` フォルダが作成されている
- 各コンポーネントファイルが生成されている

#### 1-2-2. テスト用のページコンポーネントの作成

`src/app/test-components/page.tsx` ファイルを作成して、インストールしたコンポーネントをテスト：

```tsx
// src/app/test-components/page.tsx

"use client" // このコンポーネントはクライアントサイドで実行

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function TestComponentsPage() {
  // フォームの状態管理用のstate
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  })

  // 入力値の変更を処理する関数
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev, // 既存のデータを保持
      [field]: value // 指定されたフィールドのみ更新
    }))
  }

  // フォーム送信を処理する関数
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault() // ページのリロードを防ぐ
    console.log('送信されたデータ:', formData)
    alert(`送信されました: ${formData.name} (${formData.email})`)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ページタイトル */}
      <h1 className="text-3xl font-bold text-center">
        UIコンポーネントテスト
      </h1>

      {/* ボタンのテスト */}
      <Card>
        <CardHeader>
          <CardTitle>ボタンコンポーネント</CardTitle>
          <CardDescription>
            様々なスタイルのボタンをテストします
          </CardDescription>
        </CardHeader>
        <CardContent className="space-x-2">
          <Button variant="default">デフォルト</Button>
          <Button variant="secondary">セカンダリ</Button>
          <Button variant="destructive">危険</Button>
          <Button variant="outline">アウトライン</Button>
          <Button variant="ghost">ゴースト</Button>
        </CardContent>
      </Card>

      {/* フォームのテスト */}
      <Card>
        <CardHeader>
          <CardTitle>フォームコンポーネント</CardTitle>
          <CardDescription>
            入力フィールドとラベルのテストフォームです
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 名前入力フィールド */}
            <div className="space-y-2">
              <Label htmlFor="name">氏名</Label>
              <Input
                id="name"
                type="text"
                placeholder="山田太郎"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>

            {/* メールアドレス入力フィールド */}
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="yamada@example.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
            </div>

            {/* 送信ボタン */}
            <Button type="submit" className="w-full">
              送信
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 現在の入力値を表示 */}
      <Card>
        <CardHeader>
          <CardTitle>入力状態</CardTitle>
          <CardDescription>
            リアルタイムで入力値を表示します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
```

#### 1-2-3. 動作確認

ブラウザで `http://localhost:3000/test-components` にアクセスして、各コンポーネントが正しく表示されることを確認します。

**確認ポイント**:
- ボタンのスタイルが正しく適用されている
- フォームの入力が正常に動作する
- 入力値がリアルタイムで表示される

---

## ステップ1.3: Auth.js による認証機能の実装

### 🎯 目標
消防団員が安全にログインできる認証システムを構築する

### 📚 学習内容
- Auth.js の基本概念
- 認証フローの理解
- セッション管理の仕組み

### 🛠️ 実装手順

#### 1-3-1. Auth.js のインストール

```bash
# Auth.js (NextAuth.js v5 beta) と関連パッケージをインストール
npm install next-auth@beta @auth/prisma-adapter
```

**注意**: 
- NextAuth.js v5 はベータ版のため、`@beta` タグが必要です
- v5 では設定形式が v4 から変更されているため、本チュートリアルではv5形式で解説します

#### 1-3-2. Auth.js の設定ファイル作成

`src/lib/auth.ts` ファイルを作成して認証設定を行います：

```typescript
// src/lib/auth.ts

import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

// Auth.js の設定オプション
export const { handlers, signIn, signOut, auth } = NextAuth({
  // Prisma アダプターを使用してデータベースと連携
  adapter : PrismaAdapter(prisma),

  // 認証プロバイダーの設定
  providers : [
    Credentials({
      // プロバイダーの名前
      name : "credentials",

      // ログインフォームのフィールド定義
      credentials : {
        email : {
          label : "メールアドレス",
          type : "email",
          placeholder : "your-email@example.com"
        },
        password : {
          label : "パスワード",
          type : "password"
        }
      },

      // 認証処理を行う関数
      async authorize(credentials) {
        // 入力値の検証
        if ( !credentials?.email || !credentials?.password ) {
          return null
        }

        try {
          // データベースからユーザーを検索
          const user = await prisma.user.findUnique({
            where : {
              email : credentials.email as string
            }
          })

          // ユーザーが存在しない、または非アクティブな場合
          if ( !user || !user.isActive ) {
            return null
          }

          // 実際のプロジェクトでは、ここでパスワードのハッシュ化比較を行います
          // 現在は簡易実装（本番環境では絶対に使用しないでください）
          const isValidPassword = credentials.password === "password123"

          if ( !isValidPassword ) {
            return null
          }

          // 認証成功時にユーザー情報を返す
          return {
            id : user.id,
            email : user.email,
            name : user.name,
            role : user.role,
          }
        } catch ( error ) {
          console.error("認証エラー:", error)
          return null
        }
      }
    })
  ],

  // セッション管理の設定
  session : {
    strategy : "jwt", // JWT を使用してセッションを管理
    maxAge : 30 * 24 * 60 * 60, // 30日間の有効期限
  },

  // JWT の設定
  jwt : {
    maxAge : 30 * 24 * 60 * 60, // JWTの有効期限
  },

  // カスタムページの設定
  pages : {
    signIn : "/auth/signin", // カスタムログインページ
    error : "/auth/error", // エラーページ
  },

  // コールバック関数の設定
  callbacks : {
    // JWT トークンにカスタム情報を追加
    async jwt({ token, user }) {
      if ( user && 'role' in user ) {
        token.role = user.role // ユーザーの役職情報を追加
      }
      return token
    },

    // セッションオブジェクトにカスタム情報を追加
    async session({ session, token }) {
      if ( token && session.user ) {
        session.user.id = token.sub || "" // ユーザーIDを追加
        session.user.role = token.role as Role // 役職情報を追加
      }
      return session
    },
  },

  // デバッグモード（開発環境でのみ有効）
  debug : process.env.NODE_ENV === "development",
})
```

#### 1-3-3. API ルートの作成

`src/app/api/auth/[...nextauth]/route.ts` ファイルを作成：

```typescript
// src/app/api/auth/[...nextauth]/route.ts

// NextAuth.js v5 でのハンドラーをインポート
import { handlers } from "@/lib/auth"

// Next.js の App Router では、API ルートで HTTP メソッドごとに名前付きエクスポートが必要
// NextAuth v5 では handlers オブジェクトから GET と POST を直接エクスポートする
export const { GET, POST } = handlers
```

#### 1-3-4. データベーススキーマの更新

Auth.js 用のテーブルを追加するため、`prisma/schema.prisma` を更新：

```prisma
// 既存のUserモデルに以下のフィールドを追加

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  phoneNumber   String?
  role          Role      @default(MEMBER)
  joinDate      DateTime  @default(now())
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Auth.js 用のフィールドを追加
  emailVerified DateTime? // メール認証の日時
  image         String?   // プロフィール画像のURL

  // Auth.js 用のリレーション
  accounts      Account[] // 外部プロバイダーのアカウント情報
  sessions      Session[] // ログインセッション情報

  @@map("users")
}

// Auth.js 用のテーブル定義

// 外部プロバイダー（Google、GitHub等）のアカウント情報
model Account {
  id                String  @id @default(cuid())
  userId            String  @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

// ログインセッション情報
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

// メール認証用のトークン
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verificationtokens")
}

// 既存のRole enum はそのまま
enum Role {
  ADMIN
  OFFICER
  MEMBER
}
```

#### 1-3-5. マイグレーションの実行

```bash
# 新しいスキーマでマイグレーションを実行
npx prisma migrate dev --name add-auth-tables
```

#### 1-3-6. ログインページの作成

`src/app/auth/signin/page.tsx` ファイルを作成：

```tsx
// src/app/auth/signin/page.tsx

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
```

#### 1-3-7. セッションプロバイダーの設定

`src/app/providers.tsx` ファイルを作成：

```tsx
// src/app/providers.tsx

"use client"

import { SessionProvider } from "next-auth/react"

// アプリケーション全体でセッション情報を管理するプロバイダー
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  )
}
```

`src/app/layout.tsx` を更新してプロバイダーを追加：

```tsx
// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import React from "react";
import { Providers } from "./providers"; // 追加

const inter = Inter({ subsets : [ 'latin' ] })

export const metadata : Metadata = {
  title : "hi-keshi app",
  description : "地域消防団の業務効率化を支援するアプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <Providers> {/* 追加 */}
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

#### 1-3-8. テストユーザーの作成

テスト用のユーザーを作成するスクリプトを実行：

```bash
# Prisma Studio を起動してデータを確認・編集
npx prisma studio
```

または、以下のAPIエンドポイントを使ってテストユーザーを作成：

```bash
# 1. 先に班を作成（Prisma Studioまたは直接DBで）
# 2. curlコマンドでテストユーザーを作成
curl -X POST http://localhost:3000/api/test-db \
  -H "Content-Type: application/json" \
  -d '{"name":"テストユーザー","email":"test@example.com","role":"ADMIN","groupId":"班のID"}'

# 班に所属していないユーザーの場合
curl -X POST http://localhost:3000/api/test-db \
  -H "Content-Type: application/json" \
  -d '{"name":"分団長","email":"admin@example.com","role":"ADMIN"}'
```

#### 1-3-9. TypeScript型定義の設定

Auth.jsでカスタムプロパティ（`role`）を使用するため、型定義を拡張します。

`src/types/next-auth.d.ts` ファイルを作成：

```typescript
// src/types/next-auth.d.ts

import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "@auth/core/jwt";
import { Role } from "@prisma/client";

declare module 'next-auth' {
  interface Session {
    user : {
      id : string,
      role : Role,
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role : Role,
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    role : Role,
  }
}
```

**型定義の説明**:
- `Session.user`に`id`と`role`プロパティを追加
- `User`インターフェースに`role`プロパティを追加  
- `JWT`トークンに`role`プロパティを追加
- PrismaクライアントからRole型をインポートして型安全性を確保

#### 1-3-10. 動作確認

1. `http://localhost:3000/auth/signin` にアクセス
2. テスト認証情報でログインを試行
3. ログイン成功後の動作を確認

#### 1-3-11. NextAuth v5 トラブルシューティング

**よくある問題と解決方法:**

**問題1**: `GET http://localhost:3000/api/auth/session 500 (Internal Server Error)`
```
ClientFetchError: Failed to execute 'json' on 'Response': Unexpected end of JSON input
```

**原因**: NextAuth v5 の設定形式が v4 と異なるため、正しく設定されていない

**解決方法**:
1. `src/lib/auth.ts` で NextAuth v5 の設定形式を使用
   ```typescript
   // ❌ v4 形式（古い）
   export const authConfig: NextAuthConfig = { ... }
   
   // ✅ v5 形式（正しい）
   export const { handlers, signIn, signOut, auth } = NextAuth({ ... })
   ```

2. `src/app/api/auth/[...nextauth]/route.ts` で handlers を使用
   ```typescript
   // ❌ v4 形式（古い）
   const handler = NextAuth(authConfig)
   export { handler as GET, handler as POST }
   
   // ✅ v5 形式（正しい）
   import { handlers } from "@/lib/auth"
   export const { GET, POST } = handlers
   ```

**問題2**: サインインページにアクセスできない (404エラー)

**原因**: サインインページが間違った場所に配置されている

**解決方法**:
- 正しいパス: `src/app/auth/signin/page.tsx`
- 間違ったパス: `src/app/api/auth/signin/page.tsx`

**問題3**: 認証後にダッシュボードページが見つからない

**原因**: ダッシュボードページが未作成

**解決方法**: 
1. `src/app/dashboard/page.tsx` を作成
2. または `router.push("/")` でホームページにリダイレクト


---

## 🎯 フェーズ1完了チェックリスト

### データベース接続 ✅
- [ ] PostgreSQL コンテナが起動している
- [ ] Prisma スキーマが正しく定義されている
- [ ] マイグレーションが正常に実行されている
- [ ] `/api/test-db` エンドポイントが動作している

### UI コンポーネント ✅
- [ ] shadcn/ui コンポーネントがインストールされている
- [ ] `/test-components` ページが正しく表示される
- [ ] フォームの入力が正常に動作する

### 認証機能 ✅
- [ ] Auth.js が正しく設定されている
- [ ] TypeScript型定義が正しく設定されている（`types/next-auth.d.ts`）
- [ ] ログインページが表示される
- [ ] テストユーザーでログインできる
- [ ] セッション情報が正しく管理されている

---

## 🚀 次のステップ

フェーズ1が完了したら、以下の準備を行ってフェーズ2に進みましょう：

1. **現在の実装を確認**: すべての機能が正常に動作することを確認
2. **コードの理解**: 各ファイルの役割と処理の流れを理解
3. **GitコミットSEO**: 実装した内容をGitにコミットして保存

### 学習した技術の復習
- **Prisma ORM**: データベースの操作方法
- **shadcn/ui**: UIコンポーネントの活用
- **Auth.js**: 認証システムの構築

フェーズ2では、これらの基盤技術を活用して実際の消防団業務に特化した機能を実装していきます。

---

## 📚 参考資料

- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Auth.js Documentation](https://authjs.dev/)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)