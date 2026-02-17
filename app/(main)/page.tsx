// app/dashboard/page.tsx (Server Componentの例)
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  // getUser() を使うのがセキュリティ上のベストプラクティスです
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    // ログインしていない場合はログイン画面へ
    return <p>ログインしていません</p>
  }

  return (
    <div>
      <h1>こんにちは、{user.email}さん！</h1>
      <p>あなたのユーザーID: {user.id}</p>
    </div>
  )
}