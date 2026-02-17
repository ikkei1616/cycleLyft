import { login } from './actions'

export default function LoginPage() {
  return (
    <div style={{ maxWidth: '300px', margin: '100px auto' }}>
      <h1>ログイン</h1>
      <form action={login} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input
          name="email"
          type="email"
          placeholder="メールアドレス"
          required
        />
        <input
          name="password"
          type="password"
          placeholder="パスワード"
          required
        />
        <button type="submit">ログイン</button>
      </form>
      <p style={{ marginTop: '20px', fontSize: '12px' }}>
        アカウントがない場合は <a href="/signUp">新規登録</a>
      </p>
    </div>
  )
}