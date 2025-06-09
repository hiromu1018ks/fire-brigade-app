// Prismaクライアントをインポート - データベース操作に必要
import { PrismaClient } from '@prisma/client'

// グローバルオブジェクトの型定義を拡張
// PrismaClientのインスタンスをグローバルに保持するための型
const globalForPrisma = global as unknown as {
  prisma : PrismaClient | undefined
}

// Prismaクライアントのインスタンスをエクスポート
// 既存のインスタンスがあればそれを使用し、なければ新規作成
// ?? はNull合体演算子 - 左辺がnullまたはundefinedの場合、右辺を返す
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log : [ 'query' ], // SQLクエリのログを有効化
  })

// 開発環境の場合のみ、グローバルオブジェクトにPrismaインスタンスを保存
// Hot Reloadingの際に複数のインスタンスが作成されるのを防ぐ
if ( process.env.NODE_ENV !== 'production' ) globalForPrisma.prisma = prisma