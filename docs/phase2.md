# フェーズ2: 出動管理システム実装チュートリアル

## 📋 学習目標
このチュートリアルでは、消防団の**班別通知システム**を含む出動管理システムのバックエンド機能を段階的に実装していきます。

**何を作るか**：
- 🚒 **出動情報の登録・管理システム**: 火災や救助要請などの緊急事態を記録
- 📍 **地域別の自動班振り分け**: 出動場所に基づいて担当班を自動判定
- 👥 **参集状況のリアルタイム管理**: 各団員の参集予定・到着状況を追跡
- 📢 **班別通知システム**: 関係する班のメンバーにのみ通知を送信

## 📚 学習内容
- **データベース設計**: 出動、参集、通知に関するテーブル設計
- **API開発**: RESTful APIの設計と実装
- **業務ロジック**: 消防団特有の業務フローをコードで実現
- **バリデーション**: 入力データの検証とエラーハンドリング
- **リレーション管理**: 複数テーブル間の関連性の扱い方

## 🎯 なぜこのシステムが必要か？
従来の消防団では：
- 📞 電話連絡で参集を呼びかけ → 時間がかかり、確実性に問題
- 📝 紙の台帳で管理 → リアルタイムな状況把握が困難
- 📻 無線で連絡 → 全員に一斉送信のため、関係ない班にも負荷

このシステムにより：
- ⚡ 即座に関係する班のメンバーにだけ通知
- 📊 参集状況をリアルタイムで可視化
- 💾 過去のデータを蓄積して分析可能

---

## ステップ2.1: 出動情報管理の基盤作成

### 🎯 このステップで実現すること
- 出動情報（火災、救助等）をデータベースに保存できるようになる
- 地域と班の関係性を活用した自動振り分け機能を実装
- APIを通じて出動情報の登録・取得ができるようになる

### 💡 なぜこのステップが重要か？
消防団では「どこで何が起こったか」「どの班が対応すべきか」を瞬時に判断する必要があります。このステップでは、その基盤となるデータ構造とAPIを構築します。

### 2.1.1 データベーススキーマの拡張

**何をするか**: 既存のデータベースに出動情報を管理するための新しいテーブルを追加します。

**追加するテーブル**:
1. **Emergency（出動情報）**: 災害の基本情報を記録
2. **EmergencyResponse（出動対応記録）**: 各団員の参集状況を記録

まず、出動関連のテーブルを`prisma/schema.prisma`に追加します。

```prisma
// prisma/schema.prisma に追加

// 緊急出動情報を管理するテーブル
model Emergency {
  id          String   @id @default(cuid()) // 一意なID
  title       String   // 出動名称（例: "住宅火災"）
  description String?  // 詳細説明
  location    String   // 出動場所
  latitude    Float?   // 緯度（地図連携用）
  longitude   Float?   // 経度（地図連携用）
  emergencyType String // 災害種別（fire, rescue, medical等）
  severity    String   // 緊急度（high, medium, low）
  status      String   @default("active") // ステータス（active, completed, cancelled）
  
  // 班別通知のための地域判定
  targetAreaId String? // 対象地域のID
  targetArea   Area?   @relation(fields: [targetAreaId], references: [id])
  
  // 対象班（自動判定または手動指定）
  targetGroupId String? // 対象班のID
  targetGroup   Group?  @relation(fields: [targetGroupId], references: [id])
  
  createdAt   DateTime @default(now()) // 作成日時
  updatedAt   DateTime @updatedAt      // 更新日時
  
  // リレーション
  responses   EmergencyResponse[] // 出動対応記録
  
  @@map("emergencies") // テーブル名をemergenciesに設定
}

// 出動対応記録テーブル（どの団員がどのように対応したか）
model EmergencyResponse {
  id            String   @id @default(cuid()) // 一意なID
  
  // 関連する出動情報
  emergencyId   String   // 出動情報のID
  emergency     Emergency @relation(fields: [emergencyId], references: [id], onDelete: Cascade)
  
  // 対応した団員
  userId        String   // 団員のID
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // 参集方法
  responseType  String   // 参集方法（"station" = 詰所参集, "direct" = 現場直行）
  
  // 到着予定・実績
  estimatedArrival DateTime? // 到着予定時刻
  actualArrival    DateTime? // 実際の到着時刻
  
  // ステータス
  status        String   @default("dispatched") // ステータス（dispatched, enroute, arrived, completed）
  
  // その他
  notes         String?  // 備考
  createdAt     DateTime @default(now()) // 登録日時
  updatedAt     DateTime @updatedAt      // 更新日時
  
  // 複合ユニーク制約（同じ出動に同じ団員は1つの記録のみ）
  @@unique([emergencyId, userId])
  @@map("emergency_responses") // テーブル名を設定
}

// 既存のUserモデルにリレーションを追加
model User {
  // 既存のフィールド...
  
  // 出動対応記録
  emergencyResponses EmergencyResponse[]
  
  // 既存の内容...
}

// 既存のGroupモデルにリレーションを追加
model Group {
  // 既存のフィールド...
  
  // この班が対象となる出動
  emergencies Emergency[]
  
  // 既存の内容...
}

// 既存のAreaモデルにリレーションを追加
model Area {
  // 既存のフィールド...
  
  // この地域で発生した出動
  emergencies Emergency[]
  
  // 既存の内容...
}
```

### 2.1.2 マイグレーションの実行

**何をするか**: 上記で定義したスキーマをデータベースに反映させます。

**マイグレーションとは**: データベースの構造（テーブルやカラム）を変更する作業のことです。Prismaでは、スキーマファイルの変更を自動的にSQLに変換してデータベースに適用してくれます。

```bash
# マイグレーションファイルを生成してデータベースに適用
npx prisma migrate dev --name add_emergency_management

# Prismaクライアントを再生成（TypeScript型定義を更新）
npx prisma generate
```

**実行される処理の詳細**:
1. **マイグレーションファイルの生成**: `prisma/migrations/` フォルダに新しいSQLファイルが作成
2. **データベースの更新**: PostgreSQLにEmergency、EmergencyResponseテーブルが作成
3. **型定義の更新**: TypeScriptから新しいテーブルにアクセスできるようになる

**成功時の出力例**:
```
✔ Generated Prisma Client (version) to ./node_modules/@prisma/client
Your database is now in sync with your schema.
```

### 2.1.3 出動情報登録API（POST /api/emergency）

**何をするか**: 新しい出動情報をデータベースに登録するAPIエンドポイントを作成します。

**APIエンドポイントとは**: ブラウザやアプリから送られてきたデータを受け取って、適切な処理を行う窓口のことです。今回は `POST /api/emergency` というURLで出動情報を受け取り、データベースに保存します。

**このAPIが行う処理**:
1. **入力データの検証**: 送られてきたデータが正しい形式かチェック
2. **班の自動判定**: 出動場所の地域IDから担当班を特定
3. **データベースへの保存**: 出動情報をEmergencyテーブルに登録
4. **通知の送信**: 担当班のメンバーに通知（コンソール出力で確認）

`src/app/api/emergency/route.ts`を作成します。

```typescript
// src/app/api/emergency/route.ts

import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

// Prismaクライアントのインスタンス作成（データベース接続用）
const prisma = new PrismaClient()

// 緊急出動情報作成用のバリデーションスキーマ定義
// zodライブラリを使って、APIに送られてくるデータの形式を定義
const createEmergencySchema = z.object({
  title : z.string().min(1, "出動名称は必須です"), // 出動のタイトル（必須、1文字以上）
  description : z.string().optional(), // 出動の詳細説明（任意項目）
  location : z.string().min(1, "出動場所は必須です"), // 出動場所（必須、空文字は不可）
  latitude : z.number().optional(), // 緯度情報（GPS座標、任意）
  longitude : z.number().optional(), // 経度情報（GPS座標、任意）
  emergencyType : z.enum([ 'fire', 'rescue', 'medical', 'other' ]), // 災害種別（火災、救助、医療、その他の4種類）
  severity : z.enum([ 'low', 'medium', 'high' ]), // 緊急度（低、中、高の3段階）
  targetAreaId : z.string().optional(), // 対象エリアのID（地域を指定、任意）
  targetGroupId : z.string().optional(), // 対象班のID（班を直接指定、任意）
})

// POST リクエストを処理するAPIエンドポイント
// この関数は、新しい出動情報がAPIに送信されたときに実行される
export async function POST(request : NextRequest) {
  try {
    // ステップ1: リクエストボディからJSONデータを取得
    // フロントエンドから送られてきたJSON形式のデータを取得
    const body = await request.json()

    // ステップ2: 受信したデータをスキーマでバリデーション
    // zodスキーマを使ってデータが正しい形式かチェック
    // もし不正なデータがあれば、ここでエラーが発生しcatch節に移る
    const validatedData = createEmergencySchema.parse(body)

    // ステップ3: 担当班の自動判定ロジック
    // 対象班IDの初期化（手動で班が指定されている場合はその値を使用）
    let targetGroupId = validatedData.targetGroupId

    // 対象班IDが指定されていない場合、対象エリアから班を自動判定
    if ( !targetGroupId && validatedData.targetAreaId ) {
      // 消防団の重要な機能：地域IDから担当班を自動で決定
      // 例：「A地区で火災発生」→「A地区はA班の担当」→「A班に通知」
      
      // 対象エリアIDからエリア情報を検索（関連する班情報も含む）
      const area = await prisma.area.findUnique({
        where : { id : validatedData.targetAreaId },
        include : { group : true } // includeで関連する班情報も一緒に取得
      })

      // エリアが存在し、関連する班がある場合は班IDを設定
      if ( area && area.group ) {
        targetGroupId = area.group.id
        console.log(`地域「${area.name}」から担当班「${area.group.name}」を自動判定`)
      }
    }

    // ステップ4: 緊急出動情報をデータベースに作成
    // Prismaを使ってEmergencyテーブルに新しいレコードを挿入
    const emergency = await prisma.emergency.create({
      data : {
        title : validatedData.title, // 出動名称（例：「住宅火災」）
        description : validatedData.description, // 詳細説明（例：「2階建て住宅から出火」）
        location : validatedData.location, // 出動場所（例：「○○町1-2-3」）
        latitude : validatedData.latitude, // 緯度（GPS座標）
        longitude : validatedData.longitude, // 経度（GPS座標）
        emergencyType : validatedData.emergencyType, // 災害種別（fire, rescue, medical, other）
        severity : validatedData.severity, // 緊急度（low, medium, high）
        targetAreaId : validatedData.targetAreaId, // 対象地域のID
        targetGroupId : targetGroupId, // 対象班のID（自動判定または手動指定）
        status : 'active', // 初期ステータスを「アクティブ」に設定
      },
      include : {
        targetArea : true, // 関連する地域情報も一緒に取得
        targetGroup : {
          include : {
            members : true // 班に所属するメンバー情報も一緒に取得
          }
        }
      }
    })

    // ステップ5: 対象班への通知処理
    if ( emergency.targetGroup ) {
      // TODO: 実際のプッシュ通知機能は後のステップで実装
      // 現在は開発段階なので、コンソールに出力して動作確認
      console.log(`班 ${ emergency.targetGroup.name } のメンバー ${ emergency.targetGroup.members.length }名に通知を送信`)
      console.log(`出動内容: ${emergency.title} at ${emergency.location}`)
    }

    // 成功レスポンスを返す（201 Created）
    return NextResponse.json({
      success : true,
      data : emergency
    }, { status : 201 })

  } catch ( error ) {
    // エラーが発生した場合の処理
    console.error('出動情報の作成エラー:', error)

    // エラーの種類によって異なる対応を行う
    if ( error instanceof z.ZodError ) {
      // zodのバリデーションエラーの場合（データが不正な形式）
      // 例：必須項目が空、列挙型以外の値が送信された等
      return NextResponse.json({
        success : false,
        error : 'バリデーションエラー',
        details : error.errors // どのフィールドでエラーが発生したかの詳細
      }, { status : 400 }) // 400 Bad Request（クライアント側のエラー）
    }

    // その他のサーバーエラーの場合（データベース接続エラー等）
    return NextResponse.json({
      success : false,
      error : 'サーバーエラーが発生しました'
    }, { status : 500 }) // 500 Internal Server Error（サーバー側のエラー）

  } finally {
    // try-catch が終了したら必ず実行される処理
    // エラーが発生した場合でも、データベース接続を確実に切断
    await prisma.$disconnect()
  }
}
```

**重要なポイントの解説**:

1. **バリデーション（データ検証）**: 
   - APIに送られてきたデータが正しい形式かチェック
   - 例：メールアドレス形式、必須項目の存在確認等

2. **班の自動判定ロジック**: 
   - 地域情報から担当班を自動で決定する消防団特有の機能
   - 手動指定も可能で、柔軟性を保持

3. **include文の活用**: 
   - データベースから関連情報を一緒に取得
   - 1回のクエリで必要な情報をすべて取得できるため効率的

4. **HTTPステータスコード**: 
   - 201: 新しいリソースが正常に作成された
   - 400: クライアント側のエラー（送信データが不正）
   - 500: サーバー側のエラー（システム障害等）
```

### 2.1.4 出動一覧取得API（GET /api/emergency）

**何をするか**: 登録された出動情報の一覧を取得するAPIエンドポイントを作成します。

**このAPIが行う処理**:
1. **フィルタリング**: ステータス（進行中/完了）や班IDで絞り込み
2. **ページネーション**: 大量のデータを小分けして取得
3. **関連情報の取得**: 地域情報、班情報、参集状況も一緒に取得
4. **統計情報の計算**: 参集人数などの集計データも提供

**使用場面**: 
- ダッシュボードでの出動状況一覧表示
- 過去の出動履歴の確認
- 特定の班の出動実績確認

同じファイルに GET メソッドを追加します。

```typescript
// src/app/api/emergency/route.ts に追加

// クエリパラメータのバリデーションスキーマ
const getEmergenciesSchema = z.object({
  status: z.enum(['active', 'completed', 'cancelled']).optional(), // ステータスフィルタ
  groupId: z.string().optional(), // 班IDフィルタ
  limit: z.string().transform(Number).optional(), // 取得件数制限
  offset: z.string().transform(Number).optional(), // オフセット（ページネーション用）
})

// GET /api/emergency - 出動一覧を取得
export async function GET(request: NextRequest) {
  try {
    // URLからクエリパラメータを取得
    const { searchParams } = new URL(request.url)
    const queryParams = {
      status: searchParams.get('status'),
      groupId: searchParams.get('groupId'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    }
    
    // クエリパラメータをバリデーション
    const validatedQuery = getEmergenciesSchema.parse(queryParams)
    
    // 検索条件を構築
    const where: any = {}
    
    if (validatedQuery.status) {
      where.status = validatedQuery.status // ステータスでフィルタ
    }
    
    if (validatedQuery.groupId) {
      where.targetGroupId = validatedQuery.groupId // 班IDでフィルタ
    }
    
    // データベースから出動一覧を取得
    const emergencies = await prisma.emergency.findMany({
      where, // 検索条件
      include: {
        targetArea: true, // 対象地域の情報を含める
        targetGroup: { // 対象班の情報を含める
          select: {
            id: true,
            name: true,
            _count: { // 班のメンバー数をカウント
              select: { members: true }
            }
          }
        },
        responses: { // 出動対応記録を含める
          include: {
            user: { // 対応した団員の情報を含める
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        _count: { // 関連データの件数をカウント
          select: { responses: true }
        }
      },
      orderBy: { createdAt: 'desc' }, // 作成日時の降順で並び替え
      take: validatedQuery.limit || 50, // 取得件数（デフォルト50件）
      skip: validatedQuery.offset || 0, // スキップ件数（ページネーション用）
    })
    
    // 総件数を取得（ページネーション用）
    const totalCount = await prisma.emergency.count({ where })
    
    // 成功レスポンスを返す
    return NextResponse.json({
      success: true,
      data: emergencies,
      pagination: {
        total: totalCount, // 総件数
        limit: validatedQuery.limit || 50, // 取得件数
        offset: validatedQuery.offset || 0, // オフセット
        hasMore: (validatedQuery.offset || 0) + (validatedQuery.limit || 50) < totalCount // 次のページがあるか
      }
    })
    
  } catch (error) {
    console.error('出動一覧の取得エラー:', error) // エラーログを出力
    
    // バリデーションエラーの場合
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'クエリパラメータが無効です',
        details: error.errors
      }, { status: 400 })
    }
    
    // その他のエラー
    return NextResponse.json({
      success: false,
      error: 'サーバーエラーが発生しました'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
```

### 2.1.5 出動詳細取得API（GET /api/emergency/[id]）

`src/app/api/emergency/[id]/route.ts`を作成します。

```typescript
// src/app/api/emergency/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/emergency/[id] - 特定の出動情報の詳細を取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } } // URLパラメータからIDを取得
) {
  try {
    const { id } = params // 出動ID
    
    // データベースから指定IDの出動情報を取得
    const emergency = await prisma.emergency.findUnique({
      where: { id }, // IDで検索
      include: {
        targetArea: true, // 対象地域の詳細情報
        targetGroup: { // 対象班の詳細情報
          include: {
            members: { // 班のメンバー一覧
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        responses: { // 出動対応記録
          include: {
            user: { // 対応した団員の詳細情報
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' } // 最新の対応から順番に並び替え
        }
      }
    })
    
    // 出動情報が見つからない場合
    if (!emergency) {
      return NextResponse.json({
        success: false,
        error: '指定された出動情報が見つかりません'
      }, { status: 404 }) // 404 Not Found
    }
    
    // 班別参集状況の集計
    const responseStats = {
      total: emergency.responses.length, // 総対応者数
      station: emergency.responses.filter(r => r.responseType === 'station').length, // 詰所参集者数
      direct: emergency.responses.filter(r => r.responseType === 'direct').length, // 現場直行者数
      arrived: emergency.responses.filter(r => r.actualArrival !== null).length, // 到着済み者数
      enroute: emergency.responses.filter(r => r.status === 'enroute').length, // 移動中者数
    }
    
    // 成功レスポンスを返す
    return NextResponse.json({
      success: true,
      data: {
        ...emergency, // 出動情報
        responseStats // 参集状況の統計
      }
    })
    
  } catch (error) {
    console.error('出動詳細の取得エラー:', error)
    
    return NextResponse.json({
      success: false,
      error: 'サーバーエラーが発生しました'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
```

---

## ステップ2.2: 参集状況管理機能

### 2.2.1 参集状況報告API（POST /api/emergency/[id]/response）

`src/app/api/emergency/[id]/response/route.ts`を作成します。

```typescript
// src/app/api/emergency/[id]/response/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getServerSession } from 'next-auth/next' // 認証セッションを取得
import { authOptions } from '@/lib/auth' // 認証設定

const prisma = new PrismaClient()

// 参集状況報告のバリデーションスキーマ
const responseSchema = z.object({
  responseType: z.enum(['station', 'direct']), // 参集方法（詰所 or 現場直行）
  estimatedArrival: z.string().datetime().optional(), // 到着予定時刻（ISO文字列）
  notes: z.string().optional(), // 備考
})

// POST /api/emergency/[id]/response - 参集状況を報告
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 認証セッションを確認
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: '認証が必要です'
      }, { status: 401 }) // 401 Unauthorized
    }
    
    const { id: emergencyId } = params // 出動ID
    const userId = session.user.id // 認証済みユーザーのID
    
    // リクエストボディをバリデーション
    const body = await request.json()
    const validatedData = responseSchema.parse(body)
    
    // 出動情報の存在確認
    const emergency = await prisma.emergency.findUnique({
      where: { id: emergencyId },
      include: { targetGroup: true }
    })
    
    if (!emergency) {
      return NextResponse.json({
        success: false,
        error: '指定された出動情報が見つかりません'
      }, { status: 404 })
    }
    
    // ユーザー情報と班の確認
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { group: true }
    })
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'ユーザー情報が見つかりません'
      }, { status: 404 })
    }
    
    // 班別通知の対象確認（出動対象班のメンバーかチェック）
    if (emergency.targetGroupId && user.groupId !== emergency.targetGroupId) {
      return NextResponse.json({
        success: false,
        error: 'この出動の対象班ではありません'
      }, { status: 403 }) // 403 Forbidden
    }
    
    // 参集状況を記録（既存の場合は更新、新規の場合は作成）
    const response = await prisma.emergencyResponse.upsert({
      where: {
        emergencyId_userId: { // 複合ユニークキー
          emergencyId: emergencyId,
          userId: userId
        }
      },
      update: {
        // 既存レコードの更新
        responseType: validatedData.responseType,
        estimatedArrival: validatedData.estimatedArrival ? new Date(validatedData.estimatedArrival) : null,
        notes: validatedData.notes,
        status: 'enroute', // ステータスを移動中に設定
        updatedAt: new Date()
      },
      create: {
        // 新規レコードの作成
        emergencyId: emergencyId,
        userId: userId,
        responseType: validatedData.responseType,
        estimatedArrival: validatedData.estimatedArrival ? new Date(validatedData.estimatedArrival) : null,
        notes: validatedData.notes,
        status: 'enroute' // 初期ステータスを移動中に設定
      },
      include: {
        user: { // ユーザー情報を含める
          select: {
            id: true,
            name: true,
          }
        }
      }
    })
    
    // リアルタイム通知（Socket.io で後で実装）
    // TODO: 班の他のメンバーに参集状況の更新を通知
    
    return NextResponse.json({
      success: true,
      data: response,
      message: '参集状況を報告しました'
    })
    
  } catch (error) {
    console.error('参集状況報告エラー:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'バリデーションエラー',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'サーバーエラーが発生しました'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
```

### 2.2.2 到着報告API（PUT /api/emergency/[id]/response/arrival）

`src/app/api/emergency/[id]/response/arrival/route.ts`を作成します。

```typescript
// src/app/api/emergency/[id]/response/arrival/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

// 到着報告のバリデーションスキーマ
const arrivalSchema = z.object({
  actualArrival: z.string().datetime().optional(), // 実際の到着時刻（省略時は現在時刻）
  notes: z.string().optional(), // 備考
})

// PUT /api/emergency/[id]/response/arrival - 到着を報告
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 認証確認
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: '認証が必要です'
      }, { status: 401 })
    }
    
    const { id: emergencyId } = params
    const userId = session.user.id
    
    // リクエストボディをバリデーション
    const body = await request.json()
    const validatedData = arrivalSchema.parse(body)
    
    // 既存の参集記録を確認
    const existingResponse = await prisma.emergencyResponse.findUnique({
      where: {
        emergencyId_userId: {
          emergencyId: emergencyId,
          userId: userId
        }
      }
    })
    
    if (!existingResponse) {
      return NextResponse.json({
        success: false,
        error: '参集記録が見つかりません。先に参集状況を報告してください。'
      }, { status: 404 })
    }
    
    // 到着時刻を設定（指定がない場合は現在時刻）
    const arrivalTime = validatedData.actualArrival ? 
      new Date(validatedData.actualArrival) : 
      new Date()
    
    // 参集記録を更新
    const updatedResponse = await prisma.emergencyResponse.update({
      where: {
        emergencyId_userId: {
          emergencyId: emergencyId,
          userId: userId
        }
      },
      data: {
        actualArrival: arrivalTime, // 実際の到着時刻を記録
        status: 'arrived', // ステータスを到着済みに変更
        notes: validatedData.notes || existingResponse.notes, // 備考を更新（既存の備考を保持）
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          }
        },
        emergency: {
          select: {
            id: true,
            title: true,
          }
        }
      }
    })
    
    // 到着時間の分析（参考情報）
    const responseTime = existingResponse.createdAt ? 
      Math.round((arrivalTime.getTime() - existingResponse.createdAt.getTime()) / 1000 / 60) : // 分単位
      null
    
    return NextResponse.json({
      success: true,
      data: updatedResponse,
      responseTime: responseTime, // 参集から到着までの時間（分）
      message: '到着を報告しました'
    })
    
  } catch (error) {
    console.error('到着報告エラー:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'バリデーションエラー',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'サーバーエラーが発生しました'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
```

### 2.2.3 班別参集状況取得API（GET /api/emergency/[id]/status）

`src/app/api/emergency/[id]/status/route.ts`を作成します。

```typescript
// src/app/api/emergency/[id]/status/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/emergency/[id]/status - 班別参集状況の詳細を取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: emergencyId } = params
    
    // 出動情報と関連データを取得
    const emergency = await prisma.emergency.findUnique({
      where: { id: emergencyId },
      include: {
        targetGroup: { // 対象班の情報
          include: {
            members: { // 班のメンバー一覧
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        responses: { // 参集状況の記録
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    if (!emergency) {
      return NextResponse.json({
        success: false,
        error: '指定された出動情報が見つかりません'
      }, { status: 404 })
    }
    
    // 班メンバーの参集状況を分析
    const groupMembers = emergency.targetGroup?.members || []
    const responses = emergency.responses || []
    
    // 各メンバーの状況を整理
    const memberStatus = groupMembers.map(member => {
      const response = responses.find(r => r.userId === member.id)
      
      return {
        user: member, // メンバーの基本情報
        hasResponded: !!response, // 参集報告の有無
        responseType: response?.responseType || null, // 参集方法
        status: response?.status || 'no_response', // 現在のステータス
        estimatedArrival: response?.estimatedArrival || null, // 到着予定時刻
        actualArrival: response?.actualArrival || null, // 実際の到着時刻
        responseTime: response?.actualArrival && response?.createdAt ? // 対応時間
          Math.round((response.actualArrival.getTime() - response.createdAt.getTime()) / 1000 / 60) :
          null,
        notes: response?.notes || null, // 備考
        reportedAt: response?.createdAt || null // 報告時刻
      }
    })
    
    // 統計情報の計算
    const stats = {
      totalMembers: groupMembers.length, // 班の総メンバー数
      responded: responses.length, // 参集報告者数
      notResponded: groupMembers.length - responses.length, // 未報告者数
      station: responses.filter(r => r.responseType === 'station').length, // 詰所参集者数
      direct: responses.filter(r => r.responseType === 'direct').length, // 現場直行者数
      enroute: responses.filter(r => r.status === 'enroute').length, // 移動中者数
      arrived: responses.filter(r => r.status === 'arrived').length, // 到着済み者数
      responseRate: groupMembers.length > 0 ? // 参集報告率
        Math.round((responses.length / groupMembers.length) * 100) :
        0,
      averageResponseTime: (() => { // 平均対応時間
        const responseTimes = responses
          .filter(r => r.actualArrival && r.createdAt)
          .map(r => (r.actualArrival!.getTime() - r.createdAt.getTime()) / 1000 / 60)
        
        return responseTimes.length > 0 ?
          Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) :
          null
      })()
    }
    
    return NextResponse.json({
      success: true,
      data: {
        emergency: { // 出動情報（簡易版）
          id: emergency.id,
          title: emergency.title,
          location: emergency.location,
          emergencyType: emergency.emergencyType,
          severity: emergency.severity,
          status: emergency.status,
          createdAt: emergency.createdAt
        },
        targetGroup: emergency.targetGroup ? { // 対象班の情報
          id: emergency.targetGroup.id,
          name: emergency.targetGroup.name,
        } : null,
        memberStatus, // 各メンバーの詳細状況
        stats // 統計情報
      }
    })
    
  } catch (error) {
    console.error('参集状況取得エラー:', error)
    
    return NextResponse.json({
      success: false,
      error: 'サーバーエラーが発生しました'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
```

---

## ステップ2.3: 班別通知機能の基礎実装

### 2.3.1 通知管理テーブルの追加

`prisma/schema.prisma`に通知管理のテーブルを追加します。

```prisma
// prisma/schema.prisma に追加

// 通知管理テーブル
model Notification {
  id            String   @id @default(cuid()) // 一意なID
  
  // 通知内容
  title         String   // 通知タイトル
  message       String   // 通知メッセージ
  type          String   // 通知種別（emergency, training, general等）
  
  // 関連する出動情報（出動通知の場合）
  emergencyId   String?  // 出動情報のID
  emergency     Emergency? @relation(fields: [emergencyId], references: [id], onDelete: Cascade)
  
  // 送信対象
  targetType    String   // 送信対象タイプ（group, user, all）
  targetGroupId String?  // 対象班のID
  targetGroup   Group?   @relation(fields: [targetGroupId], references: [id])
  
  // 送信ステータス
  status        String   @default("pending") // 送信ステータス（pending, sent, failed）
  sentAt        DateTime? // 送信完了日時
  
  // その他
  createdAt     DateTime @default(now()) // 作成日時
  updatedAt     DateTime @updatedAt      // 更新日時
  
  // リレーション
  recipients    NotificationRecipient[] // 個別の受信記録
  
  @@map("notifications")
}

// 通知受信記録テーブル
model NotificationRecipient {
  id             String   @id @default(cuid()) // 一意なID
  
  // 通知情報
  notificationId String   // 通知のID
  notification   Notification @relation(fields: [notificationId], references: [id], onDelete: Cascade)
  
  // 受信者
  userId         String   // 受信者のID
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // 受信・既読状況
  status         String   @default("sent") // 配信状況（sent, delivered, read, failed）
  readAt         DateTime? // 既読日時
  
  // その他
  createdAt      DateTime @default(now()) // 作成日時
  updatedAt      DateTime @updatedAt      // 更新日時
  
  // 複合ユニーク制約（同じ通知に同じユーザーは1つの記録のみ）
  @@unique([notificationId, userId])
  @@map("notification_recipients")
}

// 既存のUserモデルにリレーションを追加
model User {
  // 既存のフィールド...
  
  // 通知受信記録
  notifications NotificationRecipient[]
  
  // 既存の内容...
}

// 既存のGroupモデルにリレーションを追加
model Group {
  // 既存のフィールド...
  
  // この班宛ての通知
  notifications Notification[]
  
  // 既存の内容...
}

// 既存のEmergencyモデルにリレーションを追加
model Emergency {
  // 既存のフィールド...
  
  // この出動に関する通知
  notifications Notification[]
  
  // 既存の内容...
}
```

### 2.3.2 マイグレーション実行

```bash
# 通知機能のマイグレーションを実行
npx prisma migrate dev --name add_notification_system

# Prismaクライアントを再生成
npx prisma generate
```

### 2.3.3 通知送信API（POST /api/notifications）

`src/app/api/notifications/route.ts`を作成します。

```typescript
// src/app/api/notifications/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

// 通知作成のバリデーションスキーマ
const createNotificationSchema = z.object({
  title: z.string().min(1, 'タイトルは必須です'), // 通知タイトル
  message: z.string().min(1, 'メッセージは必須です'), // 通知メッセージ
  type: z.enum(['emergency', 'training', 'general']), // 通知種別
  emergencyId: z.string().optional(), // 関連する出動ID（出動通知の場合）
  targetType: z.enum(['group', 'user', 'all']), // 送信対象タイプ
  targetGroupId: z.string().optional(), // 対象班ID
  targetUserIds: z.array(z.string()).optional(), // 対象ユーザーIDリスト
})

// POST /api/notifications - 新しい通知を作成・送信
export async function POST(request: NextRequest) {
  try {
    // 認証確認（管理者権限が必要）
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({
        success: false,
        error: '認証が必要です'
      }, { status: 401 })
    }
    
    // TODO: 管理者権限のチェック
    // if (!session.user.isAdmin) { ... }
    
    // リクエストボディをバリデーション
    const body = await request.json()
    const validatedData = createNotificationSchema.parse(body)
    
    // 送信対象ユーザーを特定
    let targetUserIds: string[] = []
    
    switch (validatedData.targetType) {
      case 'all':
        // 全ユーザーを対象
        const allUsers = await prisma.user.findMany({
          select: { id: true }
        })
        targetUserIds = allUsers.map(user => user.id)
        break
        
      case 'group':
        // 指定班のメンバーを対象
        if (!validatedData.targetGroupId) {
          return NextResponse.json({
            success: false,
            error: 'グループ通知には対象班IDが必要です'
          }, { status: 400 })
        }
        
        const group = await prisma.group.findUnique({
          where: { id: validatedData.targetGroupId },
          include: { members: { select: { id: true } } }
        })
        targetUserIds = group?.members.map(user => user.id) || []
        break
        
      case 'user':
        // 指定ユーザーを対象
        if (!validatedData.targetUserIds || validatedData.targetUserIds.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'ユーザー通知には対象ユーザーIDが必要です'
          }, { status: 400 })
        }
        targetUserIds = validatedData.targetUserIds
        break
    }
    
    // 対象ユーザーが存在しない場合
    if (targetUserIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: '送信対象のユーザーが見つかりません'
      }, { status: 400 })
    }
    
    // トランザクションで通知と受信記録を作成
    const result = await prisma.$transaction(async (tx) => {
      // 通知を作成
      const notification = await tx.notification.create({
        data: {
          title: validatedData.title,
          message: validatedData.message,
          type: validatedData.type,
          emergencyId: validatedData.emergencyId,
          targetType: validatedData.targetType,
          targetGroupId: validatedData.targetGroupId,
          status: 'pending' // 初期ステータス
        }
      })
      
      // 各対象ユーザーの受信記録を作成
      const recipients = await tx.notificationRecipient.createMany({
        data: targetUserIds.map(userId => ({
          notificationId: notification.id,
          userId: userId,
          status: 'sent' // 送信済みステータス
        }))
      })
      
      return { notification, recipientCount: recipients.count }
    })
    
    // 実際の通知配信（Web Push API等）
    try {
      await sendPushNotifications(targetUserIds, {
        title: validatedData.title,
        body: validatedData.message,
        data: {
          notificationId: result.notification.id,
          type: validatedData.type,
          emergencyId: validatedData.emergencyId
        }
      })
      
      // 送信完了をマーク
      await prisma.notification.update({
        where: { id: result.notification.id },
        data: {
          status: 'sent',
          sentAt: new Date()
        }
      })
      
    } catch (pushError) {
      console.error('プッシュ通知送信エラー:', pushError)
      
      // 送信失敗をマーク
      await prisma.notification.update({
        where: { id: result.notification.id },
        data: { status: 'failed' }
      })
    }
    
    return NextResponse.json({
      success: true,
      data: {
        notificationId: result.notification.id,
        recipientCount: result.recipientCount
      },
      message: `${result.recipientCount}名に通知を送信しました`
    })
    
  } catch (error) {
    console.error('通知作成エラー:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'バリデーションエラー',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: false,
      error: 'サーバーエラーが発生しました'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// プッシュ通知送信関数（実装例）
async function sendPushNotifications(
  userIds: string[], 
  payload: { title: string; body: string; data?: any }
) {
  // TODO: 実際のWeb Push API実装
  console.log(`${userIds.length}名にプッシュ通知送信:`, payload)
  
  // 例: Service Workerへの送信
  // const webpush = require('web-push')
  // for (const userId of userIds) {
  //   const subscription = await getUserPushSubscription(userId)
  //   if (subscription) {
  //     await webpush.sendNotification(subscription, JSON.stringify(payload))
  //   }
  // }
}
```

### 2.3.4 出動情報作成時の自動通知機能

先ほど作成した`src/app/api/emergency/route.ts`の POST メソッドを修正して、出動作成時に自動通知を送信します。

```typescript
// src/app/api/emergency/route.ts の POST メソッドを修正

// 出動情報作成後に自動通知を送信する部分を追加
export async function POST(request: NextRequest) {
  try {
    // ... 既存の処理 ...
    
    // 出動情報を作成
    const emergency = await prisma.emergency.create({
      // ... 既存のデータ ...
    })
    
    // 班別自動通知の実行
    if (emergency.targetGroup && emergency.targetGroup.members.length > 0) {
      try {
        // 通知を作成
        const notification = await prisma.notification.create({
          data: {
            title: `【緊急出動】${emergency.title}`, // 通知タイトル
            message: `${emergency.location}で${emergency.emergencyType}が発生しました。参集をお願いします。`, // 通知メッセージ
            type: 'emergency', // 緊急通知
            emergencyId: emergency.id, // 関連する出動ID
            targetType: 'group', // 班向け通知
            targetGroupId: emergency.targetGroupId, // 対象班
            status: 'pending'
          }
        })
        
        // 対象班のメンバーに受信記録を作成
        const recipients = await prisma.notificationRecipient.createMany({
          data: emergency.targetGroup.members.map(user => ({
            notificationId: notification.id,
            userId: user.id,
            status: 'sent'
          }))
        })
        
        // プッシュ通知を送信
        await sendPushNotifications(
          emergency.targetGroup.members.map(user => user.id),
          {
            title: `【緊急出動】${emergency.title}`,
            body: `${emergency.location}で${emergency.emergencyType}が発生しました`,
            data: {
              notificationId: notification.id,
              emergencyId: emergency.id,
              type: 'emergency'
            }
          }
        )
        
        // 通知送信完了をマーク
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            status: 'sent',
            sentAt: new Date()
          }
        })
        
        console.log(`班 ${emergency.targetGroup.name} のメンバー ${recipients.count}名に緊急通知を送信しました`)
        
      } catch (notificationError) {
        console.error('自動通知送信エラー:', notificationError)
        // 通知送信が失敗しても出動作成は成功とする
      }
    }
    
    // ... 既存のレスポンス処理 ...
    
  } catch (error) {
    // ... 既存のエラーハンドリング ...
  }
}
```

---

## 学習ポイントとまとめ

### このチュートリアルで学んだこと

1. **データベース設計**
   - リレーショナルデータベースの設計方法
   - Prismaスキーマの定義とマイグレーション
   - 外部キーとリレーションの設定

2. **API設計**
   - RESTful APIの設計原則
   - 適切なHTTPステータスコードの使用
   - バリデーションとエラーハンドリング

3. **認証・認可**
   - NextAuth.jsを使った認証処理
   - ユーザーセッションの確認
   - 権限に基づくアクセス制御

4. **班別通知システム**
   - 地域から班への自動判定ロジック
   - 対象を絞った通知配信システム
   - 通知の送信状況管理

5. **トランザクション処理**
   - データの整合性を保つトランザクション
   - 複数テーブルの一括操作

### 次のステップ

このチュートリアルで作成したAPIを使って、以下の機能を実装できます：

1. **フロントエンド実装**
   - React フォームによる出動登録画面
   - リアルタイム参集状況表示画面

2. **リアルタイム機能**
   - Socket.ioによるリアルタイム更新
   - 参集状況の即座な共有

3. **Web Push API**
   - ブラウザプッシュ通知の実装
   - Service Workerの設定

4. **地図連携**
   - Google Maps APIとの連携
   - 現場への経路案内機能

### テスト方法

作成したAPIは以下の方法でテストできます：

```bash
# 開発サーバーを起動
npm run dev

# API テスト例（curl コマンド）
# 1. 出動情報作成
curl -X POST http://localhost:3000/api/emergency \
  -H "Content-Type: application/json" \
  -d '{
    "title": "住宅火災",
    "location": "○○町1-2-3",
    "emergencyType": "fire",
    "severity": "high",
    "targetAreaId": "area_id_here"
  }'

# 2. 出動一覧取得
curl http://localhost:3000/api/emergency

# 3. 参集状況報告（認証が必要）
curl -X POST http://localhost:3000/api/emergency/[id]/response \
  -H "Content-Type: application/json" \
  -d '{
    "responseType": "station",
    "estimatedArrival": "2025-06-10T15:30:00Z"
  }'
```

このチュートリアルを通じて、消防団の業務効率化に必要な**班別通知システム**の基礎が完成しました。実際の運用では、セキュリティやパフォーマンスの最適化も重要になります。