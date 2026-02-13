# 🕺 ダンス大会マネージャー — セットアップガイド

家族で使えるWebアプリをVercel + Firebaseで公開する手順です。

---

## 📋 必要なもの

- **Googleアカウント**（Firebase用）
- **GitHubアカウント**（Vercelデプロイ用・無料）
- **Node.js**（v18以上）— [https://nodejs.org](https://nodejs.org) からインストール
- **PC**（Windows / Mac どちらでもOK）

---

## 🔥 ステップ1: Firebaseプロジェクトを作成

### 1-1. Firebaseコンソールにアクセス
- [https://console.firebase.google.com](https://console.firebase.google.com) を開く
- 「プロジェクトを追加」をクリック
- プロジェクト名: `dance-manager`（好きな名前でOK）
- Googleアナリティクスはオフでも可 → 「プロジェクトを作成」

### 1-2. Webアプリを追加
- プロジェクトのトップ画面で「</>」（Webアイコン）をクリック
- アプリのニックネーム: `dance-web`
- 「Firebase Hostingも設定する」はチェック不要
- 「アプリを登録」
- **表示される設定情報（firebaseConfig）をメモ！** 後で使います

```
apiKey: "AIza..."
authDomain: "dance-manager-xxxxx.firebaseapp.com"
projectId: "dance-manager-xxxxx"
storageBucket: "dance-manager-xxxxx.appspot.com"
messagingSenderId: "123456789"
appId: "1:123456789:web:abcdef"
```

### 1-3. Google認証を有効化
- 左メニュー「Authentication」→「始める」
- 「ログイン方法」タブ → 「Google」をクリック
- 「有効にする」をオン
- サポートメール: 自分のメールを選択
- 「保存」

### 1-4. Firestoreデータベースを作成
- 左メニュー「Firestore Database」→「データベースを作成」
- 「本番モード」を選択 → 「次へ」
- ロケーション: `asia-northeast1`（東京）→ 「有効にする」

### 1-5. Firestoreセキュリティルール
- 「ルール」タブを開いて以下に書き換え → 「公開」

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /families/{familyId}/{document=**} {
      allow read, write: if request.auth != null
        && request.auth.token.email in resource.data.members
        || request.auth != null
        && request.auth.token.email in request.resource.data.members;
    }
    match /families/{familyId} {
      allow create: if request.auth != null;
      allow read, write: if request.auth != null
        && request.auth.token.email in resource.data.members;
    }
  }
}
```

---

## 💻 ステップ2: プロジェクトをセットアップ

### 2-1. ファイルを配置
ダウンロードしたプロジェクトフォルダ `dance-project` をPCの好きな場所に保存。

### 2-2. Firebase設定を反映
`src/firebase.js` を開いて、ステップ1-2でメモした値に書き換え：

```javascript
const firebaseConfig = {
  apiKey: "ここにあなたのAPIキー",
  authDomain: "ここにあなたのauthDomain",
  projectId: "ここにあなたのprojectId",
  storageBucket: "ここにあなたのstorageBucket",
  messagingSenderId: "ここにあなたのmessagingSenderId",
  appId: "ここにあなたのappId",
};
```

### 2-3. 依存パッケージをインストール
ターミナル（コマンドプロンプト）を開いて：

```bash
cd dance-project
npm install
```

### 2-4. ローカルで動作確認

```bash
npm run dev
```

ブラウザで `http://localhost:5173` が開けばOK！

---

## 🚀 ステップ3: Vercelにデプロイ

### 3-1. GitHubにプッシュ
```bash
cd dance-project
git init
git add .
git commit -m "初回コミット"
```
- GitHubで新しいリポジトリを作成（例: `dance-manager`）
- 表示されるコマンドに従ってプッシュ

### 3-2. Vercelに接続
- [https://vercel.com](https://vercel.com) にGitHubアカウントでログイン
- 「Add New Project」→ 作成したリポジトリを選択
- Framework: `Vite` が自動検出されるはず
- 「Deploy」をクリック
- 数分でデプロイ完了！URLが発行されます 🎉

### 3-3. Firebase側でドメインを許可
- Firebaseコンソール → Authentication → 設定 → 承認済みドメイン
- Vercelで発行されたドメイン（例: `dance-manager.vercel.app`）を追加

---

## ✅ 完了！

これでお母さんにURLを送って、Googleアカウントでログインすれば同じデータを共有できます！

### 💡 よくある質問

**Q: スマホからも使える？**
A: はい！URLをスマホのブラウザで開けばそのまま使えます。ホーム画面に追加するとアプリっぽくなります。

**Q: 無料で使い続けられる？**
A: はい。VercelもFirebaseも無料枠で十分です（Firestoreは1日5万回の読み取りまで無料）。

**Q: データのバックアップは？**
A: Firebaseコンソールからエクスポートできます。
