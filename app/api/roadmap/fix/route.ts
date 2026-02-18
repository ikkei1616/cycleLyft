import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { issue } = await req.json();

  // 1. ログインユーザーの取得
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. DBからユーザープロフィールを取得
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!userData) return NextResponse.json({ error: 'User profile not found' }, { status: 404 });

  // 3. 現在のアクティブなロードマップを取得
  const { data: currentRoadmap } = await supabase
    .from('roadmaps')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!currentRoadmap) {
    return NextResponse.json({ error: 'Active roadmap not found' }, { status: 404 });
  }

  // 4. 直近2週間のトレーニング実績を取得
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const { data: recentLogs } = await supabase
    .from('workout_log')
    .select('*')
    .eq('user_id', user.id)
    .gte('created_at', twoWeeksAgo.toISOString())
    .order('created_at', { ascending: false });

  // 実績をわかりやすくまとめる
  const performanceSummary = recentLogs && recentLogs.length > 0
    ? recentLogs.map(log => {
        const logDate = new Date(log.created_at).toLocaleDateString('ja-JP', { 
          month: 'numeric', 
          day: 'numeric' 
        });
        return `[${logDate}] ${log.exercise_name}: ${log.weight}kg × ${log.reps}回 (第${log.num_of_week}週 Day${log.num_of_day})`;
      }).join('\n')
    : 'トレーニング実績なし';

  // 5. Geminiへのプロンプト構築
  const systemPrompt = `
あなたはプロのストレングスコーチです。ユーザーの現在の計画と実績、そして課題を分析し、改善された筋トレ計画を作成してください。

【ユーザー情報】
- 性別: ${userData.gender}, 年齢: ${userData.age}歳
- 身長: ${userData.height}cm, 体重: ${userData.weight}kg
- 開始時の重量: ベンチプレス${userData.start_bench_press_weight}kg, スクワット${userData.start_squat_weight}kg, デッドリフト${userData.start_deadlift_weight}kg

【現在の目標】
${currentRoadmap.goal_text}

【現在の計画（抜粋）】
${JSON.stringify(currentRoadmap.menu_json, null, 2)}

【直近2週間の実績】
${performanceSummary}

【ユーザーからの課題・改善要望】
${issue}

【あなたの指示】
1. 現在の計画と実績のギャップを分析してください
2. 停滞している場合はディロード（重量を一時的に落とす）やボリュームの調整を提案してください
3. ユーザーの課題に具体的に応えた改善計画を立ててください
4. 計画の期間は最大でも3ヶ月（12週間）としてください

【重要】
以下のJSON形式のみを出力してください。JSON以外のテキスト（説明文、Markdownなど）は一切含めないでください。

{
  "totalWeeks": 8,
  "frequencyPerWeek": 3,
  "explanation": "今回の修正ポイントと改善理由を300文字程度で説明",
  "roadmap": [
    {
      "week": 1,
      "days": [
        {
          "dayIndex": 1,
          "menu": [
            {
              "name": "種目名",
              "sets": 3,
              "reps": 10,
              "weight": 40,
              "rest": 90
            }
          ]
        }
      ]
    }
  ]
}

【制約】
- 漸進性過負荷の原則を守りつつ、課題に応じた調整を行うこと
- 怪我のリスクを避けること
- 実績データから適切な重量設定を判断すること
- 出力は純粋なJSONのみとすること
`;

  try {
    // 6. Geminiで新しいロードマップを生成
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: systemPrompt
    });
    
    if (!result || !result.text) {
      return NextResponse.json({ error: "リクエストに失敗しました" }, { status: 501 });
    }

    const responseText = result.text;
    console.log("Gemini Response:", responseText.substring(0, 200)); // デバッグ用
    
    // マークダウンのコードブロックを除去
    let cleanedText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    // JSONの開始と終了を見つけて抽出（より堅牢な処理）
    const jsonStart = cleanedText.indexOf('{');
    const jsonEnd = cleanedText.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1) {
      console.error("JSON not found in response:", cleanedText.substring(0, 200));
      return NextResponse.json({ 
        error: 'Invalid response format',
        debug: cleanedText.substring(0, 200)
      }, { status: 500 });
    }
    
    cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
    
    const roadmapJson = JSON.parse(cleanedText);

    return NextResponse.json({ success: true, data: roadmapJson });

  } catch (error) {
    console.error("Gemini Error:", error);
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: 'Failed to generate roadmap',
        message: error.message
      }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to generate roadmap' }, { status: 500 });
  }
}
