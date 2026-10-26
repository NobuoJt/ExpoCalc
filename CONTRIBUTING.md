# 開発ルール

このリポジトリは個人開発です。全体ルールは `server-nobuo/PROJECT-RULES.md` を参照。

- Node.js は **pnpm** を使う（`npm` / `yarn` を混在させない）。
- 依存追加後は `pnpm install` し、`pnpm-lock.yaml` をコミットする。
- 変更前に `pnpm run lint` / `pnpm run build` / `pnpm test`（ある場合）を通す。
- コミットは Conventional Commits: `<type>(<scope>): <要約>`。
- 秘密情報（`.env`、webhook、トークン）をコミットしない。
- 詳細な設計・実装手順はこのリポジトリ内に置く。
