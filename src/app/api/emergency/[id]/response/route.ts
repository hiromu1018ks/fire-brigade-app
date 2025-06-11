// 必要なライブラリをインポートします
// Next.jsのサーバーサイド機能を使用するためのライブラリ
import { NextRequest, NextResponse } from "next/server";
// データの検証（バリデーション）を行うためのライブラリ
import { z } from "zod";
// ユーザー認証機能を使用するためのライブラリ
import { auth } from "@/lib/auth";
// データベース操作を行うためのライブラリ
import { PrismaClient } from "@prisma/client";

// データベースとの接続を管理するクライアントを作成します
const prisma = new PrismaClient();

// 参集状況の報告データの形式を定義します
// responseType: 参集方法（消防署経由か直接参集か）
// estimatedArrival: 到着予定時刻（任意）
// notes: 備考（任意）
const responseSchema = z.object({
  responseType: z.enum(["station", "direct"]),
  estimatedArrival: z.string().datetime().optional(),
  notes: z.string().optional(),
});

// 参集状況を報告するためのAPIエンドポイントを定義します
// POST /api/emergency/[id]/response というURLでアクセスできます
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ユーザーがログインしているか確認します
    // セッション情報を取得します
    const session = await auth();
    // セッションが存在しない、またはユーザー情報がない場合はエラーを返します
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: "認証が必要です",
        },
        { status: 401 }
      );
    }

    // URLから緊急出動のIDを取得します
    const { id: emergencyId } = params;
    // ログインしているユーザーのIDを取得します
    const userId = session.user.id;

    // リクエストの本文（body）から送信されたデータを取得します
    const body = await request.json();
    // 取得したデータが正しい形式かどうか確認します
    const validatedData = responseSchema.parse(body);

    // データベースから緊急出動の情報を取得します
    // 対象となる班の情報も一緒に取得します
    const emergency = await prisma.emergency.findUnique({
      where: { id: emergencyId },
      include: { targetGroup: true },
    });

    // 緊急出動情報が見つからない場合はエラーを返します
    if (!emergency) {
      return NextResponse.json(
        {
          success: false,
          error: "指定された出動情報が見つかりません",
        },
        { status: 404 }
      );
    }

    // データベースからユーザーの情報を取得します
    // 所属している班の情報も一緒に取得します
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { group: true },
    });

    // ユーザー情報が見つからない場合はエラーを返します
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "ユーザーが見つかりません",
        },
        { status: 404 }
      );
    }

    // ユーザーが緊急出動の対象班に所属しているか確認します
    // 対象班が設定されている場合、ユーザーはその班に所属している必要があります
    if (emergency.targetGroupId && user.groupId !== emergency.targetGroupId) {
      return NextResponse.json(
        {
          success: false,
          error: "この緊急出動に対して参集状況を報告する権限がありません",
        },
        { status: 403 }
      );
    }

    // 参集状況をデータベースに保存または更新します
    // 同じユーザーが同じ緊急出動に対して既に報告している場合は更新、そうでない場合は新規作成
    const response = await prisma.emergencyResponse.upsert({
      // 既存のレコードを特定するための条件を設定します
      where: {
        emergencyId_userId: {
          emergencyId: emergencyId,
          userId: userId,
        },
      },
      // 既存のレコードを更新する場合の内容を設定します
      update: {
        responseType: validatedData.responseType, // 参集方法を更新
        estimatedArrival: validatedData.estimatedArrival
          ? new Date(validatedData.estimatedArrival)
          : null, // 到着予定時刻を更新（文字列から日付型に変換）
        notes: validatedData.notes, // 備考を更新
        status: "enroute", // 状態を「向かっている途中」に設定
        updatedAt: new Date(), // 更新日時を現在時刻に設定
      },
      // 新規レコードを作成する場合の内容を設定します
      create: {
        emergencyId: emergencyId, // 緊急出動IDを設定
        userId: userId, // ユーザーIDを設定
        responseType: validatedData.responseType, // 参集方法を設定
        estimatedArrival: validatedData.estimatedArrival
          ? new Date(validatedData.estimatedArrival)
          : null, // 到着予定時刻を設定
        notes: validatedData.notes, // 備考を設定
        status: "enroute", // 状態を「向かっている途中」に設定
      },
      // レスポンスに含める関連データを設定します
      include: {
        user: {
          select: {
            id: true, // ユーザーIDを含める
            name: true, // ユーザー名を含める
          },
        },
      },
    });

    // 処理が成功した場合のレスポンスを返します
    // 作成または更新された参集状況と共に成功メッセージを返します
    return NextResponse.json({
      success: true,
      data: response,
      message: "参集状況を報告しました",
    });
  } catch (error) {
    // エラーが発生した場合の処理を行います
    // エラーの内容をコンソールに出力します
    console.error("参集状況の報告エラー:", error);

    // バリデーションエラーの場合の処理
    // 入力データが不正な場合のエラーレスポンスを返します
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "バリデーションエラー",
          details: error.errors, // 具体的なエラー内容を含める
        },
        { status: 400 }
      ); // 400 Bad Request: クライアントのリクエストが不正
    }

    // その他のサーバーエラーの場合の処理
    // 予期せぬエラーが発生した場合のエラーレスポンスを返します
    return NextResponse.json(
      {
        success: false,
        error: "サーバーエラーが発生しました",
      },
      { status: 500 }
    ); // 500 Internal Server Error: サーバー側のエラー
  } finally {
    // 最後に必ず実行される処理
    // データベースとの接続を確実に切断します
    await prisma.$disconnect();
  }
}
