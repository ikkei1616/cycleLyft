'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Dumbbell, Target, Ruler, Weight } from 'lucide-react';

type UserProfile = {
  id: string;
  name: string;
  gender: string;
  age: number;
  height: number;
  weight: number;
  icon_url: string | null;
  start_bench_press_weight: number;
  start_squat_weight: number;
  start_deadlift_weight: number;
};

type Roadmap = {
  goal_text: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goalText, setGoalText] = useState<string>('');

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/signIn');
        return;
      }

      // ユーザープロフィールを取得
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('プロフィール取得エラー:', profileError);
        setLoading(false);
        return;
      }

      setProfile(userProfile);

      // アクティブなロードマップから目標設定を取得
      const { data: roadmap, error: roadmapError } = await supabase
        .from('roadmaps')
        .select('goal_text')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!roadmapError && roadmap) {
        setGoalText(roadmap.goal_text);
      }

      setLoading(false);
    } catch (error) {
      console.error('エラー:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">読み込み中...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container max-w-2xl mx-auto py-10 px-4">
        <Card>
          <CardHeader>
            <CardTitle>プロフィールが見つかりません</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">プロフィールを設定してください。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-10 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-6 h-6" />
            プロフィール
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ユーザー情報 */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profile.icon_url || undefined} alt={profile.name} />
                <AvatarFallback>
                  <User className="w-10 h-10" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{profile.name}</h2>
                <p className="text-muted-foreground">
                  {profile.gender === 'male' ? '男性' : profile.gender === 'female' ? '女性' : 'その他'} / {profile.age}歳
                </p>
              </div>
            </div>

            {/* 身長・体重 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Ruler className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">身長</p>
                  <p className="text-xl font-semibold">{profile.height} cm</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Weight className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">体重</p>
                  <p className="text-xl font-semibold">{profile.weight} kg</p>
                </div>
              </div>
            </div>
          </div>


           {/* 目標設定 */}
          {goalText && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">目標設定</h3>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-lg font-semibold text-center">{goalText}</p>
                </div>
              </div>
            </>
          )}

          <Separator />
          
          {/* 開始時の記録 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5" />
              <h3 className="text-lg font-semibold">開始時の記録</h3>
            </div>
            <p className="text-sm text-muted-foreground">「自分はここから始まった」という記録</p>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="font-medium">ベンチプレス</span>
                <Badge variant="secondary" className="text-lg">
                  {profile.start_bench_press_weight} kg
                </Badge>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="font-medium">スクワット</span>
                <Badge variant="secondary" className="text-lg">
                  {profile.start_squat_weight} kg
                </Badge>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="font-medium">デッドリフト</span>
                <Badge variant="secondary" className="text-lg">
                  {profile.start_deadlift_weight} kg
                </Badge>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}