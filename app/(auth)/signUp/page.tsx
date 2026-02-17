import { signUp } from './actions'

export default function LoginPage() {
  return (
    <form action={signUp} className="bg-yellow-400 p-8 rounded-lg shadow-md">
      <input name="email" type="email" title="メールアドレス" required />
      <input name="password" type="password" title="パスワード" required />
      <button>サインアップ</button>
    </form>
  )
}