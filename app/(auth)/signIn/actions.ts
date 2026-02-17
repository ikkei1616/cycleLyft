'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData: FormData) {
  const supabase = await createClient()

  // フォームデータの取得
  const email = formData.get('email') 
  const password = formData.get('password') 

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    redirect("/error?message=メールアドレスとパスワードを入力してください")
  }

  // ログイン実行
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // 失敗時はエラーページへ（前回作成した共通エラーページなど）
    redirect('/error')
  }

  // 成功時はダッシュボードなどログイン後のページへ
  redirect('/')
}