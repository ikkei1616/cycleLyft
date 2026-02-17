import { createClient } from '@/lib/supabase/server'; // サーバー用クライアント
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from 'next/server';

// Geminiの初期化（環境変数に GEMINI_API_KEY を設定してください）
const ai = new GoogleGenAI({});

export async function POST(req: Request) {
  const supabase = await createClient();
  const { goal } = await req.json();

  // 1. ログインユーザーの取得
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. DBからユーザープロフィールを取得（プロンプトの材料）
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!userData) return NextResponse.json({ error: 'User profile not found' }, { status: 404 });

  // 3. Geminiの「構造化出力」の設定（型を固定してバグを防ぐ）
  // const model = ai.getGenerativeModel({
  //   model: "gemini-1.5-flash",
  //   generationConfig: {
  //     responseMimeType: "application/json",
  //   },
  // });

  // 最強のプロンプト組み立て
  const systemPrompt = `
あなたはプロのストレングスコーチです。以下のユーザー情報と目標に基づき、8週間の筋トレ計画を作成してください。
出力は指定したJSON形式のみとし、解説文を300文字程度で"explanation"に含めてください。

【ユーザー情報】
- 性別: ${userData.gender}, 年齢: ${userData.age}歳
- 身長: ${userData.height}cm, 体重: ${userData.weight}kg
- 現在の重量: ベンチプレス${userData.start_bench_press_weight}kg, スクワット${userData.start_squat_weight}kg, デッドリフト${userData.start_deadlift_weight}kg

【目標】
${goal}

【制約】
- 漸進性過負荷の原則（少しずつ重量を増やす）を徹底すること。
- 初心者向けに怪我をしない適切な強度設定をすること。

【出力形式】
{
  "explanation": "ここにプロのコーチとしての全体解説を記述。Markdown形式（# や *）が使用可能。ユーザーの筋トレのレベルに応じて文章の専門性を変えてください。",
  "totalWeeks": 8,
  "frequencyPerWeek": 3,
  "roadmap": [
    {
      "week": 1,
      "days": [
        {
          "dayIndex": 1,
          "menu": [
            {
              "name": "ベンチプレス",
              "weight": 40.0,
              "reps": 10,
              "sets": 3,
              "rest": 90
            }
          ]
        }
      ]
    }
  ]
}}

`;


  try {
    const result = await ai.models.generateContent({
      model:"gemini-2.5-flash",
      contents:systemPrompt
    });
    
    if(!result || !result.text) { 
      return NextResponse.json({error:"リクエストに失敗しました"},{status:501});
    }

    const responseText = result.text;
    console.log("parseの前::responseText",responseText)
    
    // マークダウンのコードブロックを除去
    const cleanedText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const roadmapJson = JSON.parse(cleanedText);

    // 4. 生成されたロードマップをDBに保存
    // 既存のロードマップを非アクティブにする（任意）
    // await supabase.from('roadmaps').update({ is_active: false }).eq('user_id', user.id);

    // const { data: roadmapData, error: insertError } = await supabase
    //   .from('roadmaps')
    //   .insert({
    //     user_id: user.id,
    //     goal_text: goal,
    //     menu_json: roadmapJson, // JSONをそのままぶち込む
    //     is_active: true
    //   })
    //   .select()
    //   .single();

    // if (insertError) throw insertError;

    return NextResponse.json({ success: true, data: roadmapJson });

  } catch (error) {
    console.error("Gemini Error:", error);
    return NextResponse.json({ error: 'Failed to generate roadmap' }, { status: 500 });
  }
}