// 必要なライブラリのインポート
// PrismaClient: データベースとの接続や操作を行うためのクライアント
// z: データのバリデーション（入力値の検証）を行うためのライブラリ
// NextRequest, NextResponse: Next.jsのAPIルートで使用するリクエスト・レスポンスの型
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

// Prismaクライアントのインスタンスを作成
// このインスタンスを使ってデータベースとの接続や操作を行います
const prisma = new PrismaClient();

// ----------------POST----------------
// 緊急出動情報のデータ構造を定義
// 各フィールドの意味と制約を設定します
const createEmergencySchema = z.object({
  // 出動のタイトル（必須項目）
  // 空文字列は許可されません
  title: z.string().min(1, "出動名称は必須です"),

  // 出動の詳細な説明（任意項目）
  // 入力しなくてもエラーにはなりません
  description: z.string().optional(),

  // 出動場所（必須項目）
  // 空文字列は許可されません
  location: z.string().min(1, "出動場所は必須です"),

  // 緯度情報（任意項目）
  // 数値型で、入力しなくてもエラーにはなりません
  latitude: z.number().optional(),

  // 経度情報（任意項目）
  // 数値型で、入力しなくてもエラーにはなりません
  longitude: z.number().optional(),

  // 災害の種類（必須項目）
  // 以下の4つの値のいずれかである必要があります
  emergencyType: z.enum(["fire", "rescue", "medical", "other"]),

  // 緊急度（必須項目）
  // 以下の3つの値のいずれかである必要があります
  severity: z.enum(["low", "medium", "high"]),

  // 対象エリアのID（任意項目）
  // 文字列型で、入力しなくてもエラーにはなりません
  targetAreaId: z.string().optional(),

  // 対象班のID（任意項目）
  // 文字列型で、入力しなくてもエラーにはなりません
  targetGroupId: z.string().optional(),
});

// POSTリクエストを処理する関数
// クライアントからの緊急出動情報の登録要求を受け付けます
export async function POST(request: NextRequest) {
  try {
    // リクエストの本文（body）からJSONデータを取得
    // クライアントから送信された緊急出動情報のデータを読み取ります
    const body = await request.json();

    // 取得したデータが定義したスキーマに合致するか検証
    // 必須項目が入力されているか、データ型が正しいかを確認します
    const validatedData = createEmergencySchema.parse(body);

    // 対象班IDを初期化
    // クライアントから送信された班IDを一旦保持します
    let targetGroupId = validatedData.targetGroupId;

    // 班IDが指定されていない場合の処理
    // エリアIDが指定されている場合は、そのエリアに関連する班を探します
    if (!targetGroupId && validatedData.targetAreaId) {
      // データベースからエリア情報を検索
      // エリアに関連する班情報も一緒に取得します
      const area = await prisma.area.findUnique({
        where: { id: validatedData.targetAreaId },
        include: { group: true },
      });

      // エリアが見つかり、かつ関連する班が存在する場合
      // その班のIDを対象班IDとして設定します
      if (area && area.group) {
        targetGroupId = area.group.id;
      }
    }

    // データベースに緊急出動情報を新規作成
    // 検証済みのデータを使用して新しいレコードを作成します
    const emergency = await prisma.emergency.create({
      data: {
        title: validatedData.title, // 出動のタイトル
        description: validatedData.description, // 詳細な説明
        location: validatedData.location, // 出動場所
        latitude: validatedData.latitude, // 緯度
        longitude: validatedData.longitude, // 経度
        emergencyType: validatedData.emergencyType, // 災害種別
        severity: validatedData.severity, // 緊急度
        targetAreaId: validatedData.targetAreaId, // 対象エリアID
        targetGroupId: targetGroupId, // 対象班ID
        status: "active", // 出動状態を「アクティブ」に設定
      },
      include: {
        targetArea: true, // 関連するエリア情報も取得
        targetGroup: {
          include: {
            members: true, // 班に所属するメンバー情報も取得
          },
        },
      },
    });

    // 対象班が設定されている場合の処理
    // 班のメンバーに通知を送信する準備をします
    if (emergency.targetGroup) {
      // TODO: 実際の通知処理を実装する予定
      // 現在は開発中のため、コンソールに情報を出力するだけです
      console.log(
        `班 ${emergency.targetGroup.name} のメンバー ${emergency.targetGroup.members.length}名に通知を送信`
      );
    }

    // 処理が成功した場合のレスポンス
    // 作成された緊急出動情報と共に成功メッセージを返します
    return NextResponse.json(
      {
        success: true,
        data: emergency,
      },
      { status: 201 }
    ); // 201 Created: リソースの作成が成功
  } catch (error) {
    // エラーが発生した場合の処理
    // エラーの内容をコンソールに出力します
    console.error("出動情報の作成エラー:", error);

    // バリデーションエラーの場合
    // 入力データが不正な場合のエラーレスポンス
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "バリデーションエラー",
          details: error.errors, // 具体的なエラー内容
        },
        { status: 400 }
      ); // 400 Bad Request: クライアントのリクエストが不正
    }

    // その他のサーバーエラーの場合
    // 予期せぬエラーが発生した場合のエラーレスポンス
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

// ----------------GET----------------
// クエリパラメータの検証スキーマを定義します
// 各パラメータの型と制約を設定します
const getEmergencySchema = z.object({
  // 出動の状態を指定するパラメータ（任意）
  // "active"（活動中）, "completed"（完了）, "cancelled"（キャンセル）のいずれかを指定可能
  status: z.enum(["active", "completed", "cancelled"]).optional(),
  // 対象の班IDを指定するパラメータ（任意）
  // 文字列で指定します
  groupId: z.string().optional(),
  // 取得する件数を指定するパラメータ（任意）
  // 文字列で受け取り、数値に変換します
  limit: z.string().transform(Number).optional(),
  // 取得開始位置を指定するパラメータ（任意）
  // 文字列で受け取り、数値に変換します
  offset: z.string().transform(Number).optional(),
});

// GETリクエストを処理する関数
// クライアントからの緊急出動情報の取得要求を受け付けます
export async function GET(request: NextRequest) {
  try {
    // URLからクエリパラメータを取得します
    // 例: /api/emergency?status=active&groupId=123
    const { searchParams } = new URL(request.url);

    // クエリパラメータをオブジェクトにまとめます
    // nullの場合はundefinedに変換してZodのoptional()と互換性を保ちます
    const queryParams = {
      status: searchParams.get("status") || undefined,
      groupId: searchParams.get("groupId") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    };

    // 取得したクエリパラメータを定義したスキーマで検証します
    // 不正な値が含まれている場合はエラーが発生します
    const validatedQuery = getEmergencySchema.parse(queryParams);

    // データベースの検索条件を格納するオブジェクトを作成します
    // 初期状態では空のオブジェクトです
    const where: any = {};

    // 状態（status）が指定されている場合
    // 検索条件に状態を追加します
    if (validatedQuery.status) {
      where.status = validatedQuery.status;
    }

    // 班ID（groupId）が指定されている場合
    // 検索条件に対象班IDを追加します
    if (validatedQuery.groupId) {
      where.targetGroupId = validatedQuery.groupId;
    }

    // データベースから緊急出動情報を検索します
    // 指定された条件に一致する情報を取得します
    const emergencies = await prisma.emergency.findMany({
      where, // 検索条件を指定
      include: {
        // 関連するエリア情報も一緒に取得します
        targetArea: true,
        // 関連する班情報も取得します
        targetGroup: {
          select: {
            id: true, // 班のID
            name: true, // 班の名前
            _count: {
              select: { members: true }, // 班に所属するメンバー数を取得
            },
          },
        },
        // 出動に対する応答情報も取得します
        responses: {
          include: {
            user: {
              select: {
                id: true, // 応答したユーザーのID
                name: true, // 応答したユーザーの名前
              },
            },
          },
        },
        _count: {
          select: {
            responses: true, // 応答の総数を取得
          },
        },
      },
      orderBy: { createdAt: "desc" }, // 作成日時の降順でソート
      take: validatedQuery.limit || 50, // 取得件数（指定がない場合は50件）
      skip: validatedQuery.offset || 0, // スキップする件数（指定がない場合は0件）
    });

    // 条件に一致する総件数を取得します
    // ページネーションの計算に使用します
    const totalCount = await prisma.emergency.count({ where });

    // 処理結果をJSON形式で返します
    return NextResponse.json({
      success: true, // 処理が成功したことを示すフラグ
      data: emergencies, // 取得した緊急出動情報
      pagination: {
        total: totalCount, // 総件数
        limit: validatedQuery.limit || 50, // 1ページあたりの件数
        offset: validatedQuery.offset || 0, // 現在のページの開始位置
        // 次のページがあるかどうか
        hasMore:
          (validatedQuery.offset || 0) + (validatedQuery.limit || 50) <
          totalCount,
      },
    });
  } catch (error) {
    // エラーが発生した場合の処理
    // エラーの内容をコンソールに出力します
    console.error("出動情報の取得エラー:", error);

    // バリデーションエラーの場合
    // 入力データが不正な場合のエラーレスポンス
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "バリデーションエラー",
          details: error.errors, // 具体的なエラー内容
        },
        { status: 400 }
      ); // 400 Bad Request: クライアントのリクエストが不正
    }

    // その他のサーバーエラーの場合
    // 予期せぬエラーが発生した場合のエラーレスポンス
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
