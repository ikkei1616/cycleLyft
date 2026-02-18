import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dumbbell, Target, Edit } from 'lucide-react';
import Link from 'next/link';
import type { RoadmapData } from '@/types/roadmap';

export default async function DashboardPage() {
  const supabase = await createClient();

  // ユーザー認証チェック
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return <p>ログインしていません</p>;
  }

  // アクティブなロードマップを取得
  const { data: roadmapRecord } = await supabase
    .from('roadmaps')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!roadmapRecord) {
    return (
      <div className="container max-w-2xl mx-auto py-10 px-4">
        <Card>
          <CardHeader>
            <CardTitle>ロードマップが見つかりません</CardTitle>
            <CardDescription>まずは目標を設定してロードマップを作成しましょう！</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/plan">
              <Button>ロードマップを作成</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roadmap = roadmapRecord.menu_json as RoadmapData;

  // ワークアウトログから完了数を取得
  const { data: logs } = await supabase
    .from('workout_log')
    .select('num_of_week, num_of_day')
    .eq('user_id', user.id)
    .eq('roadmap_id', roadmapRecord.id);

  // 完了した日数をカウント（重複除去）
  const completedDays = new Set(
    logs?.map((log) => `${log.num_of_week}-${log.num_of_day}`) || []
  ).size;

  const totalDays = roadmap.totalWeeks * roadmap.frequencyPerWeek;
  const progressPercentage = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  // 今日のメニューを取得（最初の未完了の日）
  const completedDaysList = logs?.map((log) => `${log.num_of_week}-${log.num_of_day}`) || [];
  let todayMenu = null;

  for (const week of roadmap.roadmap) {
    for (const day of week.days) {
      const dayKey = `${week.week}-${day.dayIndex}`;
      if (!completedDaysList.includes(dayKey)) {
        todayMenu = { week: week.week, day: day.dayIndex, exercises: day.menu };
        break;
      }
    }
    if (todayMenu) break;
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 flex gap-2 flex-col">
      {/* ロードマッププログレスバー */}
      <Link href="/roadmap">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              ロードマップ進捗
            </CardTitle>
            <CardDescription>
              全{totalDays}回中、{completedDays}回完了（{progressPercentage}%）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercentage} className="h-3" />
          </CardContent>
        </Card>
      </Link>

      {/* 今日のメニューカード */}
      {todayMenu ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5" />
              今日のメニュー（第{todayMenu.week}週 - Day {todayMenu.day}）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayMenu.exercises.map((exercise, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold">{exercise.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {exercise.sets}セット × {exercise.reps}回
                    </p>
                  </div>
                  <p className="text-lg font-bold text-primary">{exercise.weight}kg</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>🎉 すべてのトレーニングが完了しました！</CardTitle>
            <CardDescription>お疲れさまでした。新しい目標を設定しましょう。</CardDescription>
          </CardHeader>
        </Card>
      )}
      
      {/* アクションボタン */}
      <Link href="/workout">
        <Button size="lg" className="w-full h-16 text-lg">
          <Dumbbell className="mr-2 h-6 w-6" />
          筋トレ開始
        </Button>
      </Link>

      {/* 浮動修正ボタン */}
      <Link href="/fix">
        <Button
          size="lg"
          variant="outline"
          className="fixed bottom-24 right-6 h-16 w-16 rounded-full shadow-2xl z-40 bg-white border-black border-2 hover:bg-gray-100"
          title="修正"
        >
          <Edit className="h-6 w-6 text-black" />
        </Button>
      </Link>
    </div>
  );
}