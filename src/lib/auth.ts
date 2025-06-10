import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

/**
 * NextAuth.js の設定オブジェクト
 * アプリケーション全体の認証機能を管理する中心的な設定ファイル
 * ユーザー認証、セッション管理、データベース連携などを統合的に制御
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  /**
   * データベースアダプターの設定
   * NextAuth.js とデータベースを連携するためのアダプター
   * ユーザー情報、セッション、アカウント情報をPrismaを通じてデータベースに保存・取得
   */
  adapter : PrismaAdapter(prisma),

  /**
   * 認証プロバイダーの配列
   * 複数の認証方法（Google、GitHub、メール認証など）を定義可能
   * 現在はCredentialsプロバイダー（メール・パスワード認証）のみ設定
   */
  providers : [
    Credentials({
      /**
       * プロバイダーの識別名
       * ログイン画面での表示やAPIエンドポイントの識別に使用
       */
      name : "credentials",

      /**
       * ログインフォームのフィールド定義
       * フロントエンドのログインフォームに表示される入力項目を定義
       * labelは表示名、typeは入力タイプ、placeholderは入力例
       */
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

      /**
       * 認証処理の中核となる非同期関数
       * ユーザーがログインフォームを送信したときに実行される
       * @param credentials - ユーザーが入力したメールアドレスとパスワード
       * @returns 認証成功時はユーザーオブジェクト、失敗時はnull
       */
      async authorize(credentials) {
        /**
         * 入力値の基本検証
         * メールアドレスまたはパスワードが空の場合は認証を拒否
         * オプショナルチェイニング(?.)で安全にプロパティにアクセス
         */
        if ( !credentials?.email || !credentials?.password ) {
          return null
        }

        try {
          /**
           * データベースからユーザー情報を検索
           * Prismaクライアントを使用してメールアドレスに一致するユーザーを取得
           * findUniqueは一意制約のあるフィールドで検索するためのメソッド
           */
          const user = await prisma.user.findUnique({
            where : {
              email : credentials.email as string // TypeScript型アサーションでstring型を明示
            }
          })

          /**
           * ユーザーの存在確認とアクティブ状態の検証
           * ユーザーが見つからない場合、またはisActiveがfalseの場合は認証を拒否
           * 論理演算子(||)を使用して複数条件を効率的にチェック
           */
          if ( !user || !user.isActive ) {
            return null
          }

          /**
           * パスワード検証の簡易実装
           * 注意: これは開発・学習目的の実装です
           * 本番環境では必ずbcryptやscryptなどでハッシュ化されたパスワードと比較する
           * 平文パスワードの比較は重大なセキュリティリスクです
           */
          const isValidPassword = credentials.password === "password123"

          /**
           * パスワード検証結果の判定
           * パスワードが一致しない場合は認証を拒否
           */
          if ( !isValidPassword ) {
            return null
          }

          /**
           * 認証成功時のユーザー情報返却
           * NextAuth.jsのセッションで使用されるユーザーオブジェクトを構築
           * 必要最小限の情報のみを含めることでセキュリティを向上
           */
          return {
            id : user.id,        // データベースのユーザーID
            email : user.email,  // メールアドレス
            name : user.name,    // ユーザー名
            role : user.role,    // ユーザーの役職・権限
          }
        } catch ( error ) {
          /**
           * エラーハンドリング
           * データベース接続エラーや予期しない例外をキャッチ
           * セキュリティのため詳細なエラー情報はログにのみ出力
           */
          console.error("認証エラー:", error)
          return null // 認証失敗を示すnullを返却
        }
      }
    })
  ],

  /**
   * セッション管理の設定
   * ユーザーのログイン状態を維持する方法を定義
   */
  session : {
    /**
     * セッション戦略の選択
     * "jwt": JSON Web Tokenを使用（サーバーレス環境に適している）
     * "database": データベースセッション（従来型のセッション管理）
     */
    strategy : "jwt",

    /**
     * セッションの有効期限（秒単位）
     * 30日 = 30 × 24時間 × 60分 × 60秒
     * この期間を過ぎるとユーザーは再ログインが必要
     */
    maxAge : 30 * 24 * 60 * 60,
  },

  /**
   * JWT（JSON Web Token）の設定
   * JWTを使用したセッション管理の詳細設定
   */
  jwt : {
    /**
     * JWTトークンの有効期限（秒単位）
     * セッションの有効期限と同じ値に設定することが一般的
     */
    maxAge : 30 * 24 * 60 * 60,
  },

  /**
   * カスタム認証ページの設定
   * NextAuth.jsのデフォルト画面ではなく、独自のUIを使用する場合に指定
   */
  pages : {
    /**
     * カスタムログインページのパス
     * ユーザーが認証が必要なページにアクセスした際にリダイレクトされる
     */
    signIn : "/auth/signin",

    /**
     * エラーページのパス
     * 認証エラーが発生した際に表示されるページ
     */
    error : "/auth/error",
  },

  /**
   * コールバック関数の設定
   * 認証プロセスの各段階で実行される関数を定義
   * JWTトークンやセッションオブジェクトをカスタマイズ可能
   */
  callbacks : {
    /**
     * JWTコールバック関数
     * JWTトークンが作成・更新される際に実行される
     * @param token - 現在のJWTトークンペイロード
     * @param user - 新規ログイン時のユーザー情報（初回のみ）
     * @returns 更新されたJWTトークン
     */
    async jwt({ token, user }) {
      /**
       * 新規ログイン時の処理
       * userオブジェクトが存在し、かつroleプロパティを持つ場合
       * ユーザーの役職情報をJWTトークンに埋め込む
       */
      if ( user && 'role' in user ) {
        token.role = user.role // 役職情報をトークンに追加
      }
      return token // 更新されたトークンを返却
    },

    /**
     * セッションコールバック関数
     * クライアント側でセッション情報が取得される際に実行される
     * @param session - 現在のセッションオブジェクト
     * @param token - JWTトークンの内容
     * @returns 更新されたセッションオブジェクト
     */
    async session({ session, token }) {
      /**
       * セッションオブジェクトのカスタマイズ
       * JWTトークンからセッションに必要な情報を移行
       */
      if ( token && session.user ) {
        /**
         * ユーザーIDの設定
         * token.subはJWT標準のsubject（主体）クレーム
         * 通常はユーザーの一意識別子が格納される
         */
        session.user.id = token.sub || ""

        /**
         * 役職情報の設定
         * JWTトークンから役職情報を取得してセッションに追加
         * TypeScript型アサーションでRole型を明示
         */
        session.user.role = token.role as Role
      }
      return session // 更新されたセッションを返却
    },
  },

  /**
   * デバッグモードの設定
   * 開発環境でのみNextAuth.jsの詳細なログを出力
   * NODE_ENV環境変数が"development"の場合にtrueになる
   * 本番環境では自動的にfalseになりログ出力を抑制
   */
  debug : process.env.NODE_ENV === "development",
})