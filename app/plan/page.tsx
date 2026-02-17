'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Target, Dumbbell, Calendar, TrendingUp } from 'lucide-react';
import type { RoadmapData } from '@/types/roadmap';
import { createClient } from '@/lib/supabase/client';

export default function PlanNewPage() {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleGenerate = async () => {
    if (!goal) return alert("目標を入力してください！");
    
    setLoading(true);

    try {
      // ステップ2で作成するAPIを叩く
      const response = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      });

      if (!response.ok) throw new Error('生成に失敗しました');

      const result = await response.json();
      
      // roadmapデータを表示用にセット
      setRoadmap(result.data);
    } catch (error) {
      console.error(error);
      alert("AIが力尽きました。もう一度試してください。");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!roadmap) return;

    setSaving(true);

    try {
      // 1. ログインユーザーを取得
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        alert('ログインが必要です');
        return;
      }

      // 2. 既存のロードマップを非アクティブにする
      await supabase
        .from('roadmaps')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // 3. 新しいロードマップを保存
      const { error: insertError } = await supabase
        .from('roadmaps')
        .insert({
          user_id: user.id,
          goal_text: goal,
          menu_json: roadmap,
          is_active: true
        });

      if (insertError) {
        console.error("DB保存エラー:", insertError);
        throw insertError;
      }

      // 保存成功後、トップページへ
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("保存に失敗しました。もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  };

  // ロードマップが生成されたら表示
  if (roadmap) {
    return (
      <div className="container max-w-6xl mx-auto py-10 px-4 space-y-6">
        {/* ヘッダー */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Target className="w-6 h-6 text-primary" />
              あなた専用のトレーニングロードマップ
            </CardTitle>
            <CardDescription className="text-base mt-2">
              目標: {goal}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* プランの概要 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">期間</p>
                  <p className="text-2xl font-bold">{roadmap.totalWeeks}週間</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">週の頻度</p>
                  <p className="text-2xl font-bold">{roadmap.frequencyPerWeek}回/週</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Dumbbell className="w-8 h-8 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">総トレーニング</p>
                  <p className="text-2xl font-bold">{roadmap.totalWeeks * roadmap.frequencyPerWeek}回</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* コーチからの解説 */}
        {roadmap.explanation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💡 コーチからのアドバイス</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                {roadmap.explanation}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 週ごとのメニュー */}
        <div className="space-y-6">
          {roadmap.roadmap.map((week) => (
            <Card key={week.week}>
              <CardHeader className="bg-muted/50">
                <CardTitle className="text-xl">第{week.week}週</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {week.days.map((day) => (
                    <div key={day.dayIndex} className="space-y-3">
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">
                          {day.dayIndex}
                        </span>
                        Day {day.dayIndex}
                      </h4>
                      <div className="grid gap-3">
                        {day.menu.map((exercise, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Dumbbell className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <p className="font-semibold">{exercise.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {exercise.sets}セット × {exercise.reps}回 / 休憩 {exercise.rest}秒
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-primary">{exercise.weight}kg</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* アクションボタン */}
        <div className="flex justify-center gap-4 pb-8">
          <Button 
            onClick={() => setRoadmap(null)}
            variant="outline"
            size="lg"
            disabled={saving}
          >
            もう一度作成
          </Button>
          <Button 
            onClick={handleConfirm}
            size="lg"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                保存中...
              </>
            ) : (
              'この計画で確定'
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto py-10 px-4">
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Target className="text-primary w-6 h-6" />
            <CardTitle>目標設定</CardTitle>
          </div>
          <CardDescription>
            「2ヶ月でベンチプレス60kgあげたい」など、あなたの理想をAIに伝えてください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="例：週2回のジム通いで、夏までに胸板を厚くしたい。ベンチプレスの重量を現在の40kgから60kgに伸ばしたいです。"
            className="min-h-[150px] text-base"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={loading}
          />
          
          <Button 
            className="w-full h-12 text-lg font-bold" 
            onClick={handleGenerate}
            disabled={loading || !goal}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                AIがメニューを組み立て中...
              </>
            ) : (
              'ロードマップを生成する'
            )}
          </Button>
          
          {loading && (
            <p className="text-xs text-center text-muted-foreground animate-pulse">
              ※ 生成には10秒ほどかかる場合があります
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}