from __future__ import annotations

import html
from pathlib import Path

try:
    import qrcode
    from qrcode.image.svg import SvgPathImage
except ImportError as exc:
    raise SystemExit(
        "qrcode が必要です。先に `pip install -r requirements-dev.txt` を実行してください。"
    ) from exc

from resolve_public_url import resolve_public_url


ROOT = Path(__file__).resolve().parents[1]
INSTALL_DIR = ROOT / "assets" / "install"
URL_PATH = INSTALL_DIR / "install-url.txt"
QR_PATH = INSTALL_DIR / "install-qr.svg"
HTML_PATH = INSTALL_DIR / "install.html"


def write_qr_svg(public_url: str) -> None:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=12,
        border=4,
    )
    qr.add_data(public_url)
    qr.make(fit=True)
    image = qr.make_image(image_factory=SvgPathImage)
    with QR_PATH.open("wb") as handle:
        image.save(handle)


def write_install_html(public_url: str) -> None:
    escaped_url = html.escape(public_url, quote=True)
    document = f"""<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ぽんぽん花火えほん インストールQR</title>
    <style>
      :root {{
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Hiragino Sans",
          "Yu Gothic", "YuGothic", "Noto Sans JP", sans-serif;
        color: #24325f;
        background: #f7fbff;
      }}
      * {{ box-sizing: border-box; }}
      body {{
        margin: 0;
        padding: clamp(1rem, 4vw, 2rem);
        line-height: 1.75;
      }}
      main {{
        width: min(46rem, 100%);
        margin: 0 auto;
      }}
      h1 {{
        margin: 0 0 0.8rem;
        font-size: clamp(1.8rem, 6vw, 2.6rem);
        letter-spacing: 0;
      }}
      h2 {{
        margin: 1.6rem 0 0.4rem;
        font-size: 1.2rem;
        letter-spacing: 0;
      }}
      .qr {{
        width: min(22rem, 86vw);
        min-height: min(22rem, 86vw);
        display: block;
        margin: 1rem 0;
        padding: 1rem;
        background: #fff;
        border-radius: 1rem;
        box-shadow: 0 0.8rem 2rem rgba(36, 50, 95, 0.12);
      }}
      .url {{
        overflow-wrap: anywhere;
        font-weight: 700;
      }}
      ol {{
        padding-left: 1.4rem;
      }}
    </style>
  </head>
  <body>
    <main>
      <h1>ぽんぽん花火えほん</h1>
      <p>公開URL: <a class="url" href="{escaped_url}">{escaped_url}</a></p>
      <img class="qr" src="./install-qr.svg" alt="ぽんぽん花火えほんを開くQRコード">

      <h2>iPhoneでの開き方</h2>
      <ol>
        <li>カメラでQRコードを読み込みます。</li>
        <li>Safariで開きます。</li>
        <li>共有ボタンから「ホーム画面に追加」を選びます。</li>
        <li>追加すると、次回からホーム画面のアイコンで開けます。</li>
      </ol>

      <h2>Androidタブレットでの開き方</h2>
      <ol>
        <li>カメラまたはQR読み取り機能でQRコードを読み込みます。</li>
        <li>Chromeで開きます。</li>
        <li>メニューから「ホーム画面に追加」または「アプリをインストール」を選びます。</li>
        <li>追加すると、次回からホーム画面のアイコンで開けます。</li>
      </ol>
    </main>
  </body>
</html>
"""
    HTML_PATH.write_text(document, encoding="utf-8")


def generate() -> str:
    public_url = resolve_public_url(ROOT)
    INSTALL_DIR.mkdir(parents=True, exist_ok=True)
    URL_PATH.write_text(public_url + "\n", encoding="utf-8")
    write_qr_svg(public_url)
    write_install_html(public_url)
    return public_url


def main() -> None:
    public_url = generate()
    print(f"public url: {public_url}")
    print(f"generated: {URL_PATH.relative_to(ROOT)}")
    print(f"generated: {QR_PATH.relative_to(ROOT)}")
    print(f"generated: {HTML_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
