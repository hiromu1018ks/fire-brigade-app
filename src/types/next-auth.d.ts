// Next.jsのnext-authライブラリの型定義を拡張するファイル
// デフォルトの認証システムにカスタムプロパティを追加するために使用

import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "@auth/core/jwt";
import { Role } from "@prisma/client"; // Prismaで定義されたRole型をインポート

// next-authモジュールの型を拡張
declare module 'next-auth' {
  // Sessionインターface（セッション情報の型）を拡張
  interface Session {
    // userプロパティの型を再定義
    user : {
      id : string,        // ユーザーの一意識別子（文字列型）
      role : Role,        // ユーザーの権限レベル（Prismaで定義されたRole型）
    } & DefaultSession['user'] // デフォルトのuser型のプロパティも継承
  }

  // Userインターface（ユーザー情報の型）を拡張
  interface User extends DefaultUser {
    role : Role,  // ユーザーの権限レベルを追加（デフォルトのUserにはroleが含まれていない）
  }
}

// next-auth/jwtモジュールの型を拡張
declare module 'next-auth/jwt' {
  // JWTインターface（JWTトークンの型）を拡張
  interface JWT extends DefaultJWT {
    role : Role,  // JWTトークン内にユーザーの権限情報を含めるためのプロパティ
  }
}