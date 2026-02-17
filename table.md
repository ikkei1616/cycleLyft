## Usersテーブル

| **カラム名** | **データ型** | **制約** | **説明** |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, default: uuid_generate_v4() | ユーザーの一意識別子 |
| `name` | `varchar` | Not Null | ユーザー名 |
| `gender` | `varchar` | Not Null | `male` / `female` / `other` |
| `age` | `integer` | Not Null | 年齢 |
| `height` | `float` | Not Null | 身長 (cm) |
| `weight` | `float` | Not Null | 体重 (kg) |
| `icon_url` | `text` | Nullable | アイコン画像のURL |
| **`start_bench_press_weight`** | `float` |  | 開始時の最大挙上重量 (kg) |
| **`start_squat_weight`**  | `float` |  | 開始時の最大挙上重量 (kg) |
| **`start_deadlift_weight`** | `float` |  | 開始時の最大挙上重量 (kg) |
| `created_at` | `timestamp` | default: now() | 作成日時 |
| `updated_at` | `timestamp` | default: now() | 更新日時 |
| `deleted_at` | `timestamp` | Nullable | 論理削除用 |

## roadmapsテーブル

| **カラム名** | **データ型** | **制約** | **説明** |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, default: uuid_generate_v4() | ロードマップのID |
| `user_id` | `uuid` | FK (users.id) | どのユーザーの計画か |
| `goal_text` | `text` | Not Null | ユーザーが設定した目標（「2ヶ月で60kg」等） |
| **`menu_json`** | `jsonb` | Not Null | **Geminiが生成した週ごとの計画データ** |
| **`is_active`** | `boolean` | default: true | 現在進行中のメインプランかどうか |
| `created_at` | `timestamp` | default: now() | 生成日時 |
| `updated_at` | `timestamp` | default: now() | 更新日時 |
| `deleted_at` | `timestamp` | Nullable | 削除フラグ |

## workout_logテーブル

| **カラム名** | **データ型** | **制約** | **説明** |
| --- | --- | --- | --- |
| `id` | `uuid` | PK, default: uuid_generate_v4() | ログのID |
| `user_id` | `uuid` | FK (users.id) | 実行ユーザー |
| **`roadmap_id`** | `uuid` | FK (roadmaps.id) | **紐付くロードマップのID** |
| `exercise_name` | `varchar` | Not Null | 種目名（例：ベンチプレス） |
| **`weight`** | `float` | Not Null | 実際に挙げた重量 (kg) |
| **`reps`** | `integer` | Not Null | 実際に挙げた回数 |
| `set_index` | `integer` | Not Null | 何セット目か (1〜) |
| `num_of_week` | `integer` | Not Null | 計画上の第何週目の実行か |
| `num_of_day` | `integer` | Not Null | 計画上の第何日目の実行か |
| `created_at` | `timestamp` | default: now() | トレーニング日時 |
| `updated_at` | `timestamp` | default: now() |  |
| `deleted_at` | `timestamp` | Nullable |  |