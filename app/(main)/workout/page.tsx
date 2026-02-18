'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Dumbbell, Plus, Minus, CheckCircle, Timer, ChevronLeft, ChevronRight } from 'lucide-react';
import type { RoadmapData, Exercise } from '@/types/roadmap';

type WorkoutLog = {
  exercise_name: string;
  weight: number;
  reps: number;
  set_index: number;
};

export default function WorkoutPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [roadmapId, setRoadmapId] = useState<string | null>(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [currentDay, setCurrentDay] = useState(1);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [completedSetsPerExercise, setCompletedSetsPerExercise] = useState<number[]>([]);
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [previousLogs, setPreviousLogs] = useState<WorkoutLog[]>([]);

  useEffect(() => {
    loadWorkoutData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isResting && restTimeLeft > 0) {
      timer = setInterval(() => {
        setRestTimeLeft((prev) => {
          if (prev <= 1) {
            setIsResting(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isResting, restTimeLeft]);

  const loadWorkoutData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/signIn');
        return;
      }

      // アクティブなロードマップを取得
      const { data: roadmapRecord } = await supabase
        .from('roadmaps')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!roadmapRecord) {
        alert('アクティブなロードマップがありません');
        router.push('/plan');
        return;
      }

      setRoadmapId(roadmapRecord.id);
      const roadmap = roadmapRecord.menu_json as RoadmapData;

      // 完了済みの日を取得
      const { data: logs } = await supabase
        .from('workout_log')
        .select('num_of_week, num_of_day')
        .eq('user_id', user.id)
        .eq('roadmap_id', roadmapRecord.id);

      const completedDaysList = logs?.map((log) => `${log.num_of_week}-${log.num_of_day}`) || [];

      // 次にやるべき日を見つける
      let foundMenu = null;
      for (const week of roadmap.roadmap) {
        for (const day of week.days) {
          const dayKey = `${week.week}-${day.dayIndex}`;
          if (!completedDaysList.includes(dayKey)) {
            foundMenu = { week: week.week, day: day.dayIndex, exercises: day.menu };
            break;
          }
        }
        if (foundMenu) break;
      }

      if (!foundMenu) {
        alert('すべてのトレーニングが完了しています！');
        router.push('/');
        return;
      }

      setCurrentWeek(foundMenu.week);
      setCurrentDay(foundMenu.day);
      setExercises(foundMenu.exercises);
      setCompletedSetsPerExercise(new Array(foundMenu.exercises.length).fill(0));
      setWeight(foundMenu.exercises[0].weight);
      setReps(foundMenu.exercises[0].reps);

      // 前回の記録を取得
      const { data: prevLogs } = await supabase
        .from('workout_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setPreviousLogs(prevLogs || []);
      setLoading(false);
    } catch (error) {
      console.error('データ取得エラー:', error);
      alert('データの読み込みに失敗しました');
      setLoading(false);
    }
  };

  const handleSetComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !roadmapId) return;

      const currentExercise = exercises[currentExerciseIndex];
      const currentSetNumber = completedSetsPerExercise[currentExerciseIndex] + 1;

      // workout_logに保存
      const { error } = await supabase.from('workout_log').insert({
        user_id: user.id,
        roadmap_id: roadmapId,
        exercise_name: currentExercise.name,
        weight: weight,
        reps: reps,
        set_index: currentSetNumber,
        num_of_week: currentWeek,
        num_of_day: currentDay,
      });

      if (error) throw error;

      // この種目の完了セット数を更新
      const newCompletedSets = [...completedSetsPerExercise];
      newCompletedSets[currentExerciseIndex] += 1;
      setCompletedSetsPerExercise(newCompletedSets);

      // レストタイマー開始
      if (newCompletedSets[currentExerciseIndex] < currentExercise.sets) {
        setRestTimeLeft(currentExercise.rest);
        setIsResting(true);
      } else {
        // この種目の全セットが完了
        // 次の種目へ
        if (currentExerciseIndex < exercises.length - 1) {
          setCurrentExerciseIndex(currentExerciseIndex + 1);
          const nextExercise = exercises[currentExerciseIndex + 1];
          setWeight(nextExercise.weight);
          setReps(nextExercise.reps);
        } else {
          alert('🎉 今日のワークアウト完了！お疲れさまでした！');
          router.push('/');
        }
      }
    } catch (error) {
      console.error('保存エラー:', error);
      alert('保存に失敗しました');
    }
  };

  const getPreviousRecord = (exerciseName: string) => {
    const prev = previousLogs.find((log) => log.exercise_name === exerciseName);
    return prev ? `前回: ${prev.weight}kg × ${prev.reps}回` : '記録なし';
  };

  const handleExerciseChange = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, currentExerciseIndex - 1)
      : Math.min(exercises.length - 1, currentExerciseIndex + 1);
    
    if (newIndex !== currentExerciseIndex) {
      setCurrentExerciseIndex(newIndex);
      setWeight(exercises[newIndex].weight);
      setReps(exercises[newIndex].reps);
      setIsResting(false);
      setRestTimeLeft(0);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">読み込み中...</p>
      </div>
    );
  }

  const currentExercise = exercises[currentExerciseIndex];
  const currentSetNumber = completedSetsPerExercise[currentExerciseIndex];

  return (
    <div className="container max-w-2xl mx-auto py-6 px-4 space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Dumbbell className="w-6 h-6" />
              第{currentWeek}週 Day {currentDay}
            </CardTitle>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {currentExerciseIndex + 1} / {exercises.length}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* レストタイマー */}
      {isResting && (
        <Card className="border-orange-500 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-500">
              <Timer className="w-6 h-6 animate-pulse" />
              レスト中: {restTimeLeft}秒
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress 
              value={(restTimeLeft / currentExercise.rest) * 100} 
              className="h-4"
            />
          </CardContent>
        </Card>
      )}

      {/* メインセットカード */}
      <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              {currentExercise.name}
            </CardTitle>
            <p className="text-center text-muted-foreground">
              セット {currentSetNumber} / {currentExercise.sets}
            </p>
            <p className="text-center text-sm text-muted-foreground">
              {getPreviousRecord(currentExercise.name)}
            </p>
          </CardHeader>
          <CardContent className="space-y-8">
          {/* 重量調整 */}
          <div className="space-y-3">
            <p className="text-center text-sm font-semibold">重量 (kg)</p>
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                variant="outline"
                onClick={() => setWeight(Math.max(0, weight - 2.5))}
                className="h-16 w-16"
              >
                <Minus className="w-8 h-8" />
              </Button>
              <div className="text-5xl font-bold w-32 text-center">
                {weight}
              </div>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setWeight(weight + 2.5)}
                className="h-16 w-16"
              >
                <Plus className="w-8 h-8" />
              </Button>
            </div>
          </div>

          {/* 回数調整 */}
          <div className="space-y-3">
            <p className="text-center text-sm font-semibold">回数</p>
            <div className="flex items-center justify-center gap-4">
              <Button
                size="lg"
                variant="outline"
                onClick={() => setReps(Math.max(1, reps - 1))}
                className="h-16 w-16"
              >
                <Minus className="w-8 h-8" />
              </Button>
              <div className="text-5xl font-bold w-32 text-center">
                {reps}
              </div>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setReps(reps + 1)}
                className="h-16 w-16"
              >
                <Plus className="w-8 h-8" />
              </Button>
            </div>
          </div>

          {/* セット完了ボタン */}
          <Button
            size="lg"
            className="w-full h-20 text-2xl font-bold"
            onClick={handleSetComplete}
            disabled={isResting}
          >
            <CheckCircle className="mr-3 h-8 w-8" />
            セット完了
          </Button>
        </CardContent>
      </Card>

      {/* 種目切り替えボタン */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          size="lg"
          variant="outline"
          onClick={() => handleExerciseChange('prev')}
          disabled={currentExerciseIndex === 0}
          className="h-14"
        >
          <ChevronLeft className="mr-2 h-5 w-5" />
          前の種目
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => handleExerciseChange('next')}
          disabled={currentExerciseIndex === exercises.length - 1}
          className="h-14"
        >
          次の種目
          <ChevronRight className="ml-2 h-5 w-5" />
        </Button>
      </div>

      {/* ワークアウト完了ボタン */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            size="lg"
            variant="default"
            className="w-full h-16 text-lg"
          >
            <CheckCircle className="mr-2 h-6 w-6" />
            ワークアウト完了
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ワークアウトを終了しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              ホーム画面に戻ります。記録は保存されています。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push('/')}>
              終了する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
