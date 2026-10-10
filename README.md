#  車割りくん— 大会遠征用 自動配車・ルート最適化アプリ

大学の陸上競技部等の大会遠征における「車割り」と「集合場所設定」を完全自動化するWebアプリケーションです。

##  主な機能

- **自動クラスタリング**: K-means法で同乗者を地理的にグループ化
- **現実地点へのスナップ**: 数学的重心を駅・駐車場・コンビニなどの実在POIに自動補正
- **配車最適化**: Google OR-Tools の CVRP（容量制約付きVRP）ソルバーで総移動時間を最小化
- **ルート可視化**: Google Maps上でルート・集合場所・マーカーをインタラクティブに表示
- **APIキー秘匿**: 課金APIのコールは全てバックエンドで実行。フロントエンドにAPIキーは露出しない

---

##  このアプリの簡単な構造の説明

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

##  ローカルで動かしたい場合

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

##  Cloud Run へのデプロイ

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

##  プロジェクト構成

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
> 部活動レベルの利用（月数十回の最適化実行）であれば、僕ちゃんの財布には響きません！

---

## 📄 ライセンス

MIT License
