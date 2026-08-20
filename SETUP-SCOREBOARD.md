# 共有スコアボード（Supabase）— 設定済み

- 公開URL： https://yofukashiya.github.io/gomi-game/
- プロジェクト ref： `wwllodbzsvzbhtknajbe`
- テーブル： `public.scores`（マイグレーション `supabase/migrations/20260820075212_create_scores.sql`）
- クライアント設定： `js/scores.js` の `CONFIG`（publishable key はクライアント配布前提のキー）

適用済みコマンド：

```bash
supabase link --project-ref wwllodbzsvzbhtknajbe -p "$SUPABASE_DB_PASSWORD"
supabase db push --linked   -p "$SUPABASE_DB_PASSWORD"
```

## 動作確認の結果

| 確認 | 結果 |
|---|---|
| 匿名 insert | 201 ✓ |
| 匿名 select（上位順） | 200 ✓ |
| スコア 999999 | 400 `scores_score_check` で拒否 ✓ |
| 名前 20文字 | 400 `scores_name_check` で拒否 ✓ |
| 他人の行を UPDATE | 0行（RLSでブロック）✓ |
| 他人の行を DELETE | 0行（RLSでブロック）✓ |
| ブラウザ通し（名前入力→送信→一覧更新） | ✓ |

## 挙動

- BOSSステージを開くと START 画面に上位10件、**3秒ごと**に自動更新
- 初回クリア時に名前を入力 → `localStorage` に記憶して以降は自動送信
- 自分の行は黄色
- Supabaseが落ちていても「接続できません」と出るだけでゲームは動く

## テストデータを消す

`delete` ポリシーを意図的に作っていないので、REST からは消せない（＝参加者が他人のスコアを消せない）。
消すときは SQL Editor から：

```sql
delete from scores;                     -- 全消し（研修開始前に1回やると綺麗）
```

## 研修が終わったら

```sql
drop table scores;
```

`js/scores.js` の `CONFIG.url` / `CONFIG.key` を空文字にすれば、スコアボード無しの状態に戻る（ゲームはそのまま動く）。
