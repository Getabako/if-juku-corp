# if塾株式会社 コーポレートサイト（サンプル）

秋田発のAIネイティブ開発会社「if塾株式会社」（2027年4月設立予定）のホームページ案。

- 静的サイト（HTML / CSS / JS のみ、ビルド不要）
- 公開先: GitHub Pages と Vercel（main への push で両方に反映）
- 画像・図解は codex（Codex サブスクの画像生成）、会社案内は奥義スライドメーカーで制作
- 元の高解像度画像は `_src/`（git 管理外）

## ローカル確認

```
python3 -m http.server 8765
```

## 構成

- `index.html` 1ページ構成（つくり方 / 事業内容 / 導入例 / プラットフォーム / 自社ツール / ゲーム / 実績 / 人材育成 / 料金 / 会社概要 / 会社案内 / お問い合わせ）
- `assets/css/style.css` 日本語向けに本文17px・行間1.9・字間0.04em
- `assets/js/main.js` 実行ログのデモ、数字のカウントアップ、会社案内のスライド表示
- `assets/doc/if-juku-company-profile.pdf` 会社案内（10ページ）
