# 🚗 車割りオプティマイザー — 大会遠征用 自動配車・ルート最適化アプリ

大学の陸上競技部等の大会遠征における「車割り」と「集合場所設定」を完全自動化するWebアプリケーションです。

## ✨ 主な機能

- **自動クラスタリング**: K-means法で同乗者を地理的にグループ化
- **現実地点へのスナップ**: 数学的重心を駅・駐車場・コンビニなどの実在POIに自動補正
- **配車最適化**: Google OR-Tools の CVRP（容量制約付きVRP）ソルバーで総移動時間を最小化
- **ルート可視化**: Google Maps上でルート・集合場所・マーカーをインタラクティブに表示
- **APIキー秘匿**: 課金APIのコールは全てバックエンドで実行。フロントエンドにAPIキーは露出しない

---

## 🏗 アーキテクチャ（戦略β）

```
┌─────────────────────┐       HTTPS (POST /api/optimize)       ┌──────────────────────────┐
│   フロントエンド      │ ─────────────────────────────────────▶ │   バックエンド (API)       │
│   React / Vite       │                                        │   FastAPI / Python         │
│   GitHub Pages       │ ◀───────────────────────────────────── │   Cloud Run               │
│                      │       JSON (routes, polylines)         │                            │
│  Maps JS API で描画  │                                        │  Geocoding / Places /      │
│  (地図表示のみ)       │                                        │  Distance Matrix /         │
└─────────────────────┘                                        │  Directions API            │
                                                               │  + K-means + OR-Tools      │
                                                               └──────────────────────────┘
```

| レイヤー | 技術 | デプロイ先 |
|---|---|---|
| フロントエンド | React 18 / TypeScript / Vite / Tailwind CSS | GitHub Pages |
| バックエンド | Python 3.12 / FastAPI / scikit-learn / OR-Tools | Google Cloud Run |
| 地図描画 | Maps JavaScript API (`@vis.gl/react-google-maps`) | ブラウザ |
| 外部API (サーバー側) | Geocoding / Places (New) / Routes / Directions API | Cloud Run 内で呼び出し |

---

## 🔑 APIキーの取得手順（詳細）

本アプリの動作には **Google Cloud Platform (GCP)** のプロジェクトと、**2種類のAPIキー** が必要です。

### STEP 1: GCPプロジェクトの作成

1. [Google Cloud Console](https://console.cloud.google.com/) にログイン
2. 画面上部のプロジェクトセレクターをクリック → **「新しいプロジェクト」** を選択
3. プロジェクト名を入力（例: `carpool-optimizer`）して **「作成」** をクリック
4. 作成したプロジェクトを選択状態にする

### STEP 2: 課金の有効化

1. 左メニュー → **「お支払い」** をクリック
2. **「課金アカウントをリンク」** をクリック
3. クレジットカード情報を登録（新規ユーザーは \$300 の無料クレジット付き）
4. ✅ 課金が有効でないとAPIは利用できません

### STEP 3: 必要なAPIの有効化

左メニュー → **「APIとサービス」 → 「ライブラリ」** から以下の **6つのAPI** を検索して有効化してください。

| # | API名 | 用途 | 使う場所 |
|---|---|---|---|
| 1 | **Maps JavaScript API** | 地図の表示 | フロントエンド |
| 2 | **Geocoding API** | 住所 → 緯度経度 変換 | バックエンド |
| 3 | **Places API (New)** | 近隣POI検索（駅・駐車場等） | バックエンド |
| 4 | **Routes API** | Distance Matrix（移動時間行列） | バックエンド |
| 5 | **Directions API** | ルート・ポリライン取得 | バックエンド |
| 6 | **Distance Matrix API** | 移動時間マトリクス (レガシー) | バックエンド |

> 💡 「Places API」と「Places API (New)」は別物です。**「Places API (New)」** を有効化してください。

### STEP 4: APIキーの作成（2つ）

左メニュー → **「APIとサービス」 → 「認証情報」 → 「＋認証情報を作成」 → 「APIキー」**

#### キー①: バックエンド用 (`GOOGLE_MAPS_API_KEY`)

1. 作成されたキーをクリックして編集
2. 名前: `Backend API Key` に変更
3. **アプリケーションの制限**: 「IPアドレス」を選択
   - Cloud Run 使用時: 制限なしにするか、Cloud NAT の IP を指定
   - ローカル開発時: `0.0.0.0/0`（開発中のみ）
4. **APIの制限**: 「キーを制限」を選択し、以下を追加:
   - Geocoding API
   - Places API (New)
   - Routes API
   - Directions API
5. **「保存」** をクリック
6. 表示されたキー文字列（`AIza...`）をメモ → `backend/.env` の `GOOGLE_MAPS_API_KEY` に設定

#### キー②: フロントエンド用 (`VITE_GOOGLE_MAPS_API_KEY`)

1. もう一つキーを作成
2. 名前: `Frontend Maps JS Key` に変更
3. **アプリケーションの制限**: 「HTTPリファラー」を選択
   - `https://syntheon-masa-adm.github.io/*` を追加
   - ローカル開発用に `http://localhost:5173/*` も追加
4. **APIの制限**: 「キーを制限」を選択し、以下のみ追加:
   - Maps JavaScript API
5. **「保存」** をクリック
6. 表示されたキー文字列をメモ → `frontend/.env` の `VITE_GOOGLE_MAPS_API_KEY` に設定

> ⚠️ **重要**: フロントエンド用キーには必ずHTTPリファラー制限をかけてください。このキーはブラウザに公開されるため、制限なしだと不正利用されます。

---

## 🚀 ローカル開発

### 前提条件
- Python 3.10+
- Node.js 18+

### バックエンド起動

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# .env を編集: GOOGLE_MAPS_API_KEY=AIza...

uvicorn main:app --reload --port 8000
```

### フロントエンド起動

```bash
cd frontend
npm install

cp .env.example .env
# .env を編集: VITE_GOOGLE_MAPS_API_KEY=AIza...
# VITE_API_BASE_URL は空のまま（Viteプロキシが localhost:8000 に転送）

npm run dev
```

→ ブラウザで `http://localhost:5173` にアクセス

---

## ☁️ Cloud Run へのデプロイ

### STEP 1: gcloud CLI の準備

```bash
# gcloud CLI のインストール（未インストールの場合）
# https://cloud.google.com/sdk/docs/install

gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### STEP 2: バックエンドのデプロイ

```bash
cd backend

# Cloud Run にビルド＆デプロイ（一発コマンド）
gcloud run deploy carpool-api \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_MAPS_API_KEY=AIza_YOUR_BACKEND_KEY \
  --memory 1Gi \
  --timeout 120
```

デプロイ完了後、表示される URL（`https://carpool-api-xxxxx-an.a.run.app`）をメモしてください。

### STEP 3: フロントエンドの設定更新

GitHub リポジトリの **Settings → Secrets and variables → Actions** で以下のシークレットを設定:

| シークレット名 | 値 |
|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | フロントエンド用 Maps JS API キー |
| `VITE_API_BASE_URL` | Cloud Run の URL（例: `https://carpool-api-xxxxx-an.a.run.app`） |

設定後、`main` ブランチにプッシュすると GitHub Actions が自動でビルド＆デプロイします。

---

## 📂 プロジェクト構成

```
carpool-optimizer/
├── backend/
│   ├── main.py                  # FastAPI エントリーポイント（/api/optimize）
│   ├── models.py                # Pydantic スキーマ
│   ├── requirements.txt         # Python 依存関係
│   ├── Dockerfile               # Cloud Run 用
│   ├── .dockerignore
│   ├── .env.example
│   └── services/
│       ├── geocoding.py         # Geocoding API + キャッシュ
│       ├── clustering.py        # K-means クラスタリング
│       ├── poi_snap.py          # Places API (New) POI スナップ
│       ├── distance_matrix.py   # Routes API 移動時間マトリクス
│       ├── vrp_solver.py        # OR-Tools CVRP ソルバー
│       └── route_builder.py     # Directions API ルート生成
├── frontend/
│   ├── package.json
│   ├── vite.config.ts           # Vite設定（プロキシ + base path）
│   ├── .env.example
│   └── src/
│       ├── App.tsx              # メインレイアウト
│       ├── api/optimizer.ts     # バックエンド API クライアント
│       ├── types/index.ts       # TypeScript 型定義
│       └── components/
│           ├── InputForm.tsx    # 入力フォーム
│           ├── MapView.tsx      # Google Maps 地図描画
│           ├── ResultPanel.tsx  # 結果パネル
│           └── RouteCard.tsx    # ルートカード
├── .github/workflows/
│   └── deploy.yml               # GitHub Pages CI/CD
└── README.md
```

---

## 💰 API利用料金の目安

| API | 料金 | 無料枠 |
|---|---|---|
| Geocoding API | \$5 / 1000 req | 月 \$200 無料クレジット |
| Places API (New) | \$5 / 1000 req | 月 \$200 無料クレジット |
| Routes API | \$5 / 1000 elements | 月 \$200 無料クレジット |
| Directions API | \$5 / 1000 req | 月 \$200 無料クレジット |
| Maps JS API | \$7 / 1000 loads | 月 \$200 無料クレジット |

> Google Maps Platform は月額 **\$200 の無料クレジット** が全ユーザーに付与されます。  
> 部活動レベルの利用（月数十回の最適化実行）であれば、ほぼ無料で運用可能です。

---

## 📄 ライセンス

MIT License
