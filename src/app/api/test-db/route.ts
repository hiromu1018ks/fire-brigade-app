// Next.jsのサーバーサイドAPIルートで使用する型とレスポンスクラスをインポート
import { NextRequest, NextResponse } from "next/server";
// Prismaクライアントのインスタンスをインポート
import { prisma } from "@/lib/prisma";

// GETリクエストを処理するハンドラー関数
export async function GET(request : NextRequest) {
  try {
    // データベース内の全ユーザー数を取得
    const userCount = await prisma.user.count()

    // 成功時のレスポンスを返す
    // - ユーザー総数
    // - タイムスタンプ（ISO形式）を含む
    return NextResponse.json({
      message : "success",
      userCount,
      timestamp : new Date().toISOString()
    })
  } catch ( error ) {
    // データベース接続エラーをログに記録
    console.error('db connection error : ', error)
    // エラーレスポンスを500ステータスコードで返す
    return NextResponse.json(
      { error : 'db connection error' },
      { status : 500 }
    )
  }
}

// POSTリクエストを処理するハンドラー関数
export async function POST(request : NextRequest) {
  try {
    // リクエストボディからJSONデータを取得
    const body = await request.json()
    // 必要なユーザー情報を分割代入
    const { name, email, role, groupId } = body

    // Prismaを使用して新規ユーザーを作成
    // - roleが指定されていない場合はデフォルトで'MEMBER'
    // - groupIdが指定されていない場合はnull
    // - 関連するグループ情報も含めて取得
    const newUser = await prisma.user.create({
      data : {
        name,
        email,
        role : role || 'MEMBER',
        groupId : groupId || null
      },
      include : {
        group : true
      }
    })

    // 作成したユーザー情報を含む成功レスポンスを返す
    return NextResponse.json({
      message : "success",
      user : newUser
    })
  } catch ( error ) {
    // データベース接続エラーをログに記録
    console.error('db connection error : ', error)
    // エラーレスポンスを500ステータスコードで返す
    return NextResponse.json(
      { error : 'db connection error' },
      { status : 500 }
    )
  }
}
