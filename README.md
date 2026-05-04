# ぽんぽん花火えほん

## 概要

「ぽんぽん花火えほん」は、画面を触ると花火・星・しゃぼん玉・花・きらきらが出る、幼児向けタブレット用の静的Webゲームです。

対象年齢の目安は2歳後半ごろからです。勝ち負け、スコア、ミス、失敗判定はなく、文字を読まなくても触って反応を楽しめる遊びです。

## 遊び方

画面をタップすると、タップした場所の近くにやさしい花火や星などが出ます。何度か触ると短い達成演出が出ます。「もういっかい」を押すと最初からまた遊べます。

## ローカル起動方法

```bash
python -m http.server 8000
```

PCブラウザで以下を開きます。

```text
http://localhost:8000/
```

## 公開URL

GitHub Pagesでの公開URL:

```text
https://fzr400r3en2-sys.github.io/ponpon_hanabiehon/
```

スマホ・タブレット用QRコード:

```text
assets/install/install.html
```

## 開発用パッケージのインストール

アイコンPNG生成とQRコード生成には開発用Pythonパッケージを使います。

```bash
pip install -r requirements-dev.txt
```

## アイコン生成

```bash
python tools/generate_app_icons.py
```

生成されるファイル:

- `assets/icons/icon.svg`
- `assets/icons/icon-180.png`
- `assets/icons/icon-192.png`
- `assets/icons/icon-512.png`

## QRコード生成

macOS / Linux / Git Bash の例:

```bash
PUBLIC_URL="https://example.github.io/ponpon-hanabi-ehon/" python tools/generate_install_qr.py
```

Windows PowerShell の例:

```powershell
$env:PUBLIC_URL="https://fzr400r3en2-sys.github.io/ponpon_hanabiehon/"
python tools/generate_install_qr.py
```

`PUBLIC_URL` を指定しない場合は、以下でも実行できます。

```bash
python tools/generate_install_qr.py
```

この場合は、`git remote origin` から `https://OWNER.github.io/REPO/` 形式のGitHub Pages URLの推定を試みます。推定できない場合は、`PUBLIC_URL` を指定してください。

生成されるファイル:

- `assets/install/install-url.txt`
- `assets/install/install-qr.svg`
- `assets/install/install.html`

## GitHub Pages公開後の利用手順

1. GitHub Pagesでこの静的Webアプリを公開します。
2. 公開URLを確認します。
3. `PUBLIC_URL` に公開URLを指定してQRコードを生成します。
4. スマホ・タブレットでQRコードを読み込みます。
5. iPhoneはSafariで開きます。
6. AndroidタブレットはChromeで開きます。
7. ホーム画面に追加します。

## iPhoneでのホーム画面追加手順

1. Safariで公開URLを開きます。
2. 共有ボタンを押します。
3. 「ホーム画面に追加」を選びます。
4. 追加します。

## Androidタブレットでのホーム画面追加手順

1. Chromeで公開URLを開きます。
2. メニューを開きます。
3. 「ホーム画面に追加」または「アプリをインストール」を選びます。
4. 追加します。

## Service Worker確認時の注意

- `file://` ではService Workerを確認しないでください。
- localhost または HTTPS の公開URLで確認してください。
- GitHub Pages公開後にスマホで確認してください。
- Service Worker更新時はブラウザキャッシュの影響に注意してください。

## 安全方針

- 広告なし
- 課金なし
- 外部通信なし
- 個人情報収集なし
- スコアなし
- 失敗なし
- 強い点滅なし

## 実装メモ

- ゲーム本体はHTML / CSS / JavaScript / Canvasのみで実装しています。
- ゲーム本体に外部JavaScriptライブラリは使っていません。
- 音声ファイルは使っていません。
- PWA manifest と Service Worker により、初回表示後は可能な範囲でオフライン起動できます。
