import { signUp } from './actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">新規登録</CardTitle>
          <CardDescription>
            アカウントを作成してトレーニングを始めましょう
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full">
              サインアップ
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/signIn" className="underline underline-offset-4 hover:text-primary">
              ログイン
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}