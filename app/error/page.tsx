import Link from 'next/link'

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>
}) {
  const params = await searchParams
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-red-600 mb-4">エラー</h1>
        <p className="text-gray-700 mb-6">
          {params.message || '予期しないエラーが発生しました'}
        </p>
        <Link 
          href="/signUp"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          サインアップページに戻る
        </Link>
      </div>
    </div>
  )
}
