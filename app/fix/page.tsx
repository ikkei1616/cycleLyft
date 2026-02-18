'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, AlertCircle, Dumbbell, Calendar, TrendingUp, Wrench } from 'lucide-react';
import type { RoadmapData } from '@/types/roadmap';
import { createClient } from '@/lib/supabase/client';

export default function FixPage() {
  const [issue, setIssue] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapData | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleGenerate = async () => {
    if (!issue) return alert("課題を入力してください！");
    
    setLoading(true);

    try {
      const response = await fetch('/api/roadmap/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue }),
      });

      if (!response.ok) throw new Error('生成に失敗しました');

      const result = await response.json();
      
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
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        alert('ログインが必要です');
        return;
      }

      // 現在のロードマップを取得して goal_text を保持
      const { data: currentRoadmap } = await supabase
        .from('roadmaps')
        .select('goal_text')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      // 既存のロードマップを非アクティブにする
      await supabase
        .from('roadmaps')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // 新しいロードマップを保存（元の目標を保持）
      const { error: insertError } = await supabase
        .from('roadmaps')
        .insert({
          user_id: user.id,
          goal_text: currentRoadmap?.goal_text || issue,
          menu_json: roadmap,
          is_active: true
        });

      if (insertError) {
        console.error("DB保存エラー:", insertError);
        throw insertError;
      }

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
              <Wrench className="w-6 h-6 text-primary" />
              改善されたトレーニングロードマップ
            </CardTitle>
            <CardDescription className="text-base mt-2">
              課題: {issue}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* プランの概要 */}
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-row items-center justify-around gap-4">
              <div className="flex items-center gap-2">
              
                <div>
                  <p className="text-xs text-muted-foreground">期間</p>
                  <p className="text-lg font-bold">{roadmap.totalWeeks}週間</p>
                </div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="flex items-center gap-2">
                
                <div>
                  <p className="text-xs text-muted-foreground">週の頻度</p>
                  <p className="text-lg font-bold">{roadmap.frequencyPerWeek}回/週</p>
                </div>
              </div>
              <div className="w-px h-12 bg-border" />
              <div className="flex items-center gap-2">
  
                <div>
                  <p className="text-xs text-muted-foreground">総トレーニング</p>
                  <p className="text-lg font-bold">{roadmap.totalWeeks * roadmap.frequencyPerWeek}回</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* コーチからの解説 */}
        {roadmap.explanation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">💡 コーチからの改善アドバイス</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                {roadmap.explanation}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 週ごとのメニュー（アコーディオン形式） */}
        <Accordion type="multiple" defaultValue={["week-1"]} className="space-y-4">
          {roadmap.roadmap.map((week) => (
            <AccordionItem key={week.week} value={`week-${week.week}`} className="border rounded-lg">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="text-xl font-semibold">第{week.week}週</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6 pt-2">
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
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

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
            <AlertCircle className="text-primary w-6 h-6" />
            <CardTitle>ロードマップ修正</CardTitle>
          </div>
          <CardDescription>
            現在の計画で感じている課題や改善したい点を教えてください。AIがあなたの実績を分析し、改善されたプランを提案します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="例：最近ベンチプレスが停滞していて、伸びが感じられない。重量を落としてフォームを見直したい。"
            className="min-h-[150px] text-base"
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            disabled={loading}
          />
          
          <Button 
            className="w-full h-12 text-lg font-bold" 
            onClick={handleGenerate}
            disabled={loading || !issue}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                AIが実績を分析中...
              </>
            ) : (
              '改善プランを生成する'
            )}
          </Button>
          
          {loading && (
            <p className="text-xs text-center text-muted-foreground animate-pulse">
              ※ あなたの実績とロードマップを分析しています
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}