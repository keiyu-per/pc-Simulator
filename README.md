# シミュレーター占い

スマホ向けの静的Webアプリ。リポジトリ直下で `python3 -m http.server 8000` を起動し、ブラウザで http://localhost:8000 を開く。GitHub Pagesではブランチのルートを配信元にできる。抽選と画数鑑定は端末内で実行する。

## 遊び方

星座または漢字の名前を入力し、4機種から1機種と目標初当たり回数（1・3・5回）を選んで占う。プロフィール入力は任意。最終RUSHまでの払出と通常時・右打ちの回転数を集計する。初当たりの早さと払出を同条件の4,096試行で順位付けし、同順位は中点、2項目は等しく重み付けする。結果はブラウザ内に保存し、日本時間の日付・端末・機種・目標ごとに固定する。再表示は履歴から行える。

## 実装の前提

星座占いは[Sigastraの公開API](https://sigastra.com/ja/partners/api)の日本語抜粋を取得し、日付・星座別にキャッシュする。接続障害時には再取得ボタンを表示する。名前は端末に保存し、同梱のUnihan kTotalStrokes（CP932で表現できる部分集合、複数値の場合は先頭値）で総画を計算する。字形や流派による日本の画数との違いがある。鑑定文は総画に対応するアプリ独自の簡易占い。変換済みデータとライセンスは strokes.js に収録。

抽選モデル・判定ともに版1。通常時とSTの当選間隔を幾何分布から抽選する。丸められた公表値を使用し、一連の確定払出は合算する。右打ち回転数はST・残保留の抽選回数。確定ボーナス内の消化時間、コンプリート機能はモデルの対象外。

## 機種別データ（2026-11-18確認）

- [東京喰種](https://pachi-e-tokyoghoul.jp/)　チャージ込みで抽選し、別枠の通常チャージと、図柄相当枠内の昇格を区別。
- [鬼がかり2](https://psmaga.com/e/pachi/pla/p_conq/pachi_db/daitogiken_pachi/056/kh03.php)　右打ちのRe:Startを払出0発のST更新として記録。
- [リゼロ2 249ver.](https://nana-press.com/kaiseki/machine/1132/35339/)　[強欲フリーズ](https://hisshobon.com/machineinfo/101042/)の上乗せは別行に記録。
- [まどマギ3 キュゥべえver.](https://www.p-world.co.jp/machine/database/10499)　[振り分け](https://psmaga.com/e/pachi/pla/p_conq/pachi_db/kyoraku_pachi/240/kh02.php)。残保留4回は通常RUSH側の振り分けを使用。

仕様書は [docs/SPEC.md](docs/SPEC.md)。
