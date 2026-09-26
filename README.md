# 🚗 車割りオプティマイザー — 大会遠征用 自動配車・ルート最適化アプリ

大学の陸上競技部等の大会遠征における「車割り」と「集合場所設定」を完全自動化するWebアプリケーションです。

## ✨ 主な機能

- **自動クラスタリング**: K-means法で同乗者を地理的にグループ化
- **現実地点へのスナップ**: 数学的重心を駅・駐車場・コンビニなどの実在POIに自動補正
- **配車最適化**: CVRP（容量制約付き配車問題）アルゴリズムで総移動時間を最小化
- **ルート可視化**: Google Maps上でルート・集合場所・マーカーをインタラクティブに表示
- **完全ブラウザ完結対応**: サーバー不要でGitHub Pages上ですぐに実行可能

## 🌐 公開URL (GitHub Pages)

**[https://syntheon-masa-adm.github.io/carpool-optimizer/](https://syntheon-masa-adm.github.io/carpool-optimizer/)**

> 💡 **ブラウザのみで即時利用可能**  
> 右上の「APIキー設定」に有効なGoogle Maps APIキー（Geocoding API, Places API, Distance Matrix API, Directions API, Maps JavaScript API が有効なキー）を入力するだけで、サーバー構築なしにその場で配車計画とルート最適化を実行できます。


## 🛠 技術スタック

| レイヤー | 技術 |
|---|---|
| バックエンド | Python 3.12 / FastAPI / scikit-learn / Google OR-Tools |
| フロントエンド | React 18 / TypeScript / Vite / Tailwind CSS |
| 地図 | Google Maps JavaScript API / @vis.gl/react-google-maps |
| 外部API | Geocoding API / Places API (New) / Routes API / Directions API |

## 📋 前提条件

- Python 3.10+
- Node.js 18+
- Google Cloud プロジェクトで以下のAPIを有効化:
  - Geocoding API
  - Places API (New)
  - Routes API
  - Directions API
  - Maps JavaScript API

## 🚀 セットアップ

### 1. リポジトリのクローン

```bash
cd carpool-optimizer
```

### 2. バックエンド

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 環境変数の設定
cp .env.example .env
# .env を編集して GOOGLE_MAPS_API_KEY を設定
```

### 3. フロントエンド

```bash
cd frontend
npm install

# 環境変数の設定
cp .env.example .env
# .env を編集して VITE_GOOGLE_MAPS_API_KEY を設定
```

### 4. 起動

```bash
# ターミナル1: バックエンド
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000

# ターミナル2: フロントエンド
cd frontend
npm run dev
```

ブラウザで `http://localhost:5173` にアクセスしてください。

## 📐 アルゴリズムの処理フロー

```
入力データ
  ↓
① ジオコーディング (Geocoding API)
  住所 → 緯度経度
  ↓
② K-meansクラスタリング (scikit-learn)
  同乗者をK個のグループに分割 → 各グループの重心を算出
  ↓
③ POIスナップ補正 (Places API New)
  重心 → 最寄りの駅/駐車場/コンビニに補正
  ↓
④ 移動時間マトリクス (Routes API)
  全ノード間の移動時間を取得
  ↓
⑤ VRPソルバー (OR-Tools CVRP)
  総移動時間最小化 + 容量制約
  ↓
⑥ ルート生成 (Directions API)
  各ドライバーの詳細ルート + ポリライン
  ↓
出力: ルート情報 + 地図表示
```

## 💰 APIコスト戦略

- **ジオコードキャッシュ**: 同一住所の再問い合わせを完全排除
- **Distance Matrix バッチ化**: N×N マトリクスを最小リクエスト数で取得
- **Places API 呼び出し制限**: K個のクラスター重心に対してのみ呼び出し
- **Directions API 遅延呼び出し**: 結果表示時にのみルート詳細を取得

## 📁 プロジェクト構成

```
carpool-optimizer/
├── backend/
│   ├── main.py                  # FastAPI エントリーポイント
│   ├── models.py                # Pydantic スキーマ
│   ├── requirements.txt
│   ├── .env.example
│   ├── cache/                   # ジオコードキャッシュ
│   └── services/
│       ├── geocoding.py         # Geocoding API + キャッシュ
│       ├── clustering.py        # K-means クラスタリング
│       ├── poi_snap.py          # Places API POI スナップ
│       ├── distance_matrix.py   # Routes API 時間マトリクス
│       ├── vrp_solver.py        # OR-Tools VRP ソルバー
│       └── route_builder.py     # Directions API ルート生成
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── .env.example
    └── src/
        ├── App.tsx              # メインレイアウト
        ├── api/
        │   └── optimizer.ts     # APIクライアント
        ├── types/
        │   └── index.ts         # 型定義
        └── components/
            ├── InputForm.tsx     # 入力フォーム
            ├── MapView.tsx       # Google Maps表示
            ├── ResultPanel.tsx   # 結果パネル
            └── RouteCard.tsx     # ルートカード
```

## 📝 ライセンス

SYNTHEON
