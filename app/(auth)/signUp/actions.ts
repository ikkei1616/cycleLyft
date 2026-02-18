"use server"
import { createClient } from '@/lib/supabase/server' // サーバー用クライアント
import { redirect } from 'next/navigation'

export async function signUp(formData:FormData) {
  const supabase = await createClient();

  const email = formData.get('email')
  const password = formData.get('password')

  // バリデーション
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    redirect("/error?message=メールアドレスとパスワードを入力してください")
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`
    }
  })

  if (error) {
    redirect("/error")
  }

  // 成功時のリダイレクト
  redirect("/form")
}