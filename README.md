# Receipt PDF App

GitHub Pages で動作する、完全クライアントサイドの領収書PDF生成アプリです。入力内容を IndexedDB に保存し、履歴一覧、詳細編集、再出力、削除に対応しています。

インボイス制度向けに、登録番号と税率区分、対象額、消費税額を領収書PDFに出力します。

## 構成

- `index.html`: 領収書入力フォーム
- `history.html`: 保存済み履歴一覧
- `detail.html`: 保存済み領収書の詳細編集
- `assets/js/db.js`: Dexie を使った IndexedDB 操作
- `assets/js/pdf.js`: pdf-lib と fontkit を使った PDF 生成

## 使用ライブラリ

- `pdf-lib`
- `@pdf-lib/fontkit`
- `Dexie`

いずれも ESM CDN 経由で読み込みます。GitHub Pages 上ではインターネット接続が必要です。

## データ保存

- DB名: `pdf_receipt_app`
- ストア名: `documents`
- 主キー: `id`

## PDF

- テンプレート: `assets/templates/receipt-template.pdf`
- フォント: `assets/fonts/YuMincho.ttf`

テンプレート PDF の読み込みに失敗した場合でも、新規 PDF を生成して出力を継続します。

## 公開方法

1. このディレクトリを GitHub リポジトリとして push します。
2. GitHub Pages を有効化します。
3. `index.html` を起点に利用します。
