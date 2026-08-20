# 共有スコアボードの設定（Supabase）

GitHub Pages はもう公開済み： https://yofukashiya.github.io/gomi-game/
あとは Supabase を1つ作って、キーを2箇所に貼るだけ。**5分**。

## 1. テーブルを作る

Supabase の SQL Editor に貼って実行：

```sql
create table scores (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(name) between 1 and 12),
  score      int  not null check (score between 0 and 5000),
  created_at timestamptz default now()
);
create index scores_score_idx on scores (score desc);

alter table scores enable row level security;
create policy "anon read"   on scores for select to anon using (true);
create policy "anon insert" on scores for insert to anon with check (true);
```

`check` 制約が「変な名前・ありえないスコア」を弾く唯一の防波堤なので消さないこと。

## 2. キーを貼る

Project Settings → API から2つコピーして `js/scores.js` の先頭へ：

```js
const CONFIG = {
  url: 'https://xxxxxxxx.supabase.co',   // Project URL
  key: 'eyJ...',                          // anon / publishable key
  table: 'scores',
};
```

anon key はクライアントに置く前提のキー（公開しても鍵漏洩ではない）。
ただし公開リポジトリに入るので、**誰でも insert はできる**。社内研修ならこれで十分。

## 3. 反映

```bash
git add js/scores.js && git commit -m "chore: scoreboard config" && git push
```

GitHub Pages は1〜2分で更新される。

## 動きかた

- BOSSステージを開くと、START画面に **上位10件** が出る（3秒ごとに自動更新）
- 初回クリア時に名前を入力 → 以降は `localStorage` に記憶して自動送信
- 自分の行は黄色でハイライト
- **未設定でも壊れない**：`CONFIG` が空なら「未設定」表示のままローカルのベストだけ動く

## 片付け

研修が終わったらテーブルを消すだけ：

```sql
drop table scores;
```
