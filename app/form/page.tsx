'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type FormData = {
  // 基本情報
  username: string
  gender: string
  age: string
  // 身体情報
  height: string
  weight: string
  // トレーニング情報
  benchPress: string
  squat: string
  deadlift: string
}

export default function MultiStepForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    username: '',
    gender: '',
    age: '',
    height: '',
    weight: '',
    benchPress: '',
    squat: '',
    deadlift: '',
  })

  const supabase = createClient();
  const router = useRouter(); // 初期化

  const totalSteps = 3

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    console.log('フォームデータ:', formData)
    await handleSaveProfile(formData)
  }

  const handleSaveProfile = async (formData: FormData) => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("ログインユーザーが見つかりません");
      return;
    }

    console.log("保存するユーザーデータ:", {
      id: user.id,
      name: formData.username,  
    });

    // insert -> upsert に変更して「重複エラー」を回避
    const { error: dbError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        name: formData.username,
        gender: formData.gender,
        age: parseInt(formData.age, 10),
        height: parseFloat(formData.height),
        weight: parseFloat(formData.weight),
        start_bench_press_weight: parseFloat(formData.benchPress),
        start_squat_weight: parseFloat(formData.squat),
        start_deadlift_weight: parseFloat(formData.deadlift),
      });

    if (dbError) {
      console.error("DB保存エラー:", dbError.message);
      alert("エラーが発生しました: " + dbError.message);
      return;
    }

    // router.push で高速遷移
    router.push('/plan');
  };

  return (
    <div className="min-h-screen flex flex-col p-4">
      {/* プログレスバー（3分割） */}
      <div className="w-full max-w-2xl mx-auto mb-8 pt-8">
        <div className="flex gap-2">
          <div
            className={`h-2 flex-1 rounded-full transition-colors ${
              currentStep >= 1 ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          />
          <div
            className={`h-2 flex-1 rounded-full transition-colors ${
              currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          />
          <div
            className={`h-2 flex-1 rounded-full transition-colors ${
              currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          />
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>基本情報</span>
          <span>身体情報</span>
          <span>トレーニング情報</span>
        </div>
      </div>

      {/* カード */}
      <div className="flex-1 flex items-start justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>プロフィール入力</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
          {/* ステップ1: 基本情報 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">基本情報</h2>
              
              <div className="space-y-2">
                <Label htmlFor="username">ユーザーネーム</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  placeholder="例: yamada_taro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">性別</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleInputChange('gender', value)}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="性別を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">男性</SelectItem>
                    <SelectItem value="female">女性</SelectItem>
                    <SelectItem value="other">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="age">年齢</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  placeholder="例: 25"
                />
              </div>
            </div>
          )}

          {/* ステップ2: 身体情報 */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">身体情報</h2>
              
              <div className="space-y-2">
                <Label htmlFor="height">身長 (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                  placeholder="例: 170"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">体重 (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  placeholder="例: 65"
                />
              </div>
            </div>
          )}

          {/* ステップ3: トレーニング情報 */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">トレーニング情報</h2>
              
              <div className="space-y-2">
                <Label htmlFor="benchPress">ベンチプレス最大挙上重量 (kg)</Label>
                <Input
                  id="benchPress"
                  type="number"
                  value={formData.benchPress}
                  onChange={(e) => handleInputChange('benchPress', e.target.value)}
                  placeholder="例: 80"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="squat">スクワット最大挙上重量 (kg)</Label>
                <Input
                  id="squat"
                  type="number"
                  value={formData.squat}
                  onChange={(e) => handleInputChange('squat', e.target.value)}
                  placeholder="例: 100"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadlift">デッドリフト最大挙上重量 (kg)</Label>
                <Input
                  id="deadlift"
                  type="number"
                  value={formData.deadlift}
                  onChange={(e) => handleInputChange('deadlift', e.target.value)}
                  placeholder="例: 120"
                />
              </div>
            </div>
          )}
          </CardContent>
        </Card>
      </div>

      {/* ナビゲーションボタン（画面下部） */}
      <div className="w-full max-w-2xl mx-auto pb-8 mt-8">
        <div className="flex justify-between">
          <Button
            onClick={handleBack}
            disabled={currentStep === 1}
            variant="outline"
            size="lg"
          >
            戻る
          </Button>

          {currentStep < totalSteps ? (
            <Button onClick={handleNext} size="lg">
              次へ
            </Button>
          ) : (
            <Button onClick={handleSubmit} size="lg">
              送信
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
