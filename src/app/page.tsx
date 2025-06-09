export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      {/* ページのメインコンテンツ */ }
      <div className="text-center">
        {/* アプリタイトル */ }
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          消防団業務効率化アプリ
        </h1>

        {/* 説明文 */ }
        <p className="text-lg text-gray-600 mb-8">
          地域消防団の業務効率化を支援するシステム
        </p>

        {/* 機能リスト */ }
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {/* 出動管理機能 */ }
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-3">出動管理</h2>
            <p className="text-gray-600">
              緊急出動時の情報配信と参集状況のリアルタイム管理
            </p>
          </div>

          {/* スケジュール管理機能 */ }
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-3">スケジュール管理</h2>
            <p className="text-gray-600">
              訓練・会議の予定管理と出席状況の把握
            </p>
          </div>

          {/* 装備管理機能 */ }
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-3">装備管理</h2>
            <p className="text-gray-600">
              消防車両と装備品の点検記録・管理
            </p>
          </div>

          {/* 活動記録機能 */ }
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-3">活動記録</h2>
            <p className="text-gray-600">
              出動・訓練記録と反省点の管理
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
