'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ClipboardList, TrendingUp } from 'lucide-react';

type WorkoutRecord = {
  id: string;
  exercise_name: string;
  weight: number;
  reps: number;
  created_at: string;
  estimated_1rm: number;
};

type ChartDataPoint = {
  date: string;
  max1RM: number;
};

// Epley式で推定1RMを計算
const calculate1RM = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

// チャート設定
const chartConfig = {
  max1RM: {
    label: '推定1RM',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

export default function RecordsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<WorkoutRecord[]>([]);
  const [exercises, setExercises] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableMonths, setAvailableMonths] = useState<{ [year: string]: string[] }>({});
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [maxYValue, setMaxYValue] = useState<number>(100);

  const loadRecords = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/signIn');
        return;
      }

      // 全てのワークアウトログを取得
      const { data: logs, error } = await supabase
        .from('workout_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('データ取得エラー:', error);
        setLoading(false);
        return;
      }

      if (!logs || logs.length === 0) {
        setLoading(false);
        return;
      }

      // 推定1RMを計算
      const recordsWithRM = logs.map((log) => ({
        ...log,
        estimated_1rm: calculate1RM(log.weight, log.reps),
      }));

      setRecords(recordsWithRM);

      // ユニークな種目リストを取得
      const uniqueExercises = Array.from(
        new Set(recordsWithRM.map((r) => r.exercise_name))
      );
      setExercises(uniqueExercises);

      // 利用可能な年と月のリストを生成
      const yearMonthMap: { [year: string]: Set<string> } = {};
      recordsWithRM.forEach((record) => {
        const date = new Date(record.created_at);
        const year = date.getFullYear().toString();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        
        if (!yearMonthMap[year]) {
          yearMonthMap[year] = new Set<string>();
        }
        yearMonthMap[year].add(month);
      });

      // 年のリストを生成（降順）
      const years = Object.keys(yearMonthMap).sort().reverse();
      setAvailableYears(years);

      // 各年の月のリストを生成（降順）
      const monthsByYear: { [year: string]: string[] } = {};
      years.forEach((year) => {
        monthsByYear[year] = Array.from(yearMonthMap[year]).sort().reverse();
      });
      setAvailableMonths(monthsByYear);

      // 最初の種目、年、月を選択
      if (uniqueExercises.length > 0) {
        setSelectedExercise(uniqueExercises[0]);
      }
      if (years.length > 0) {
        setSelectedYear(years[0]);
        if (monthsByYear[years[0]].length > 0) {
          setSelectedMonth(monthsByYear[years[0]][0]);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('エラー:', error);
      setLoading(false);
    }
  };

  const prepareChartData = () => {
    if (!selectedYear || !selectedMonth) return;

    // 選択された種目のデータをフィルタリング
    const exerciseRecords = records.filter((r) => r.exercise_name === selectedExercise);

    // 選択された年月でフィルタリング
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth);
    const filteredRecords = exerciseRecords.filter((record) => {
      const recordDate = new Date(record.created_at);
      return recordDate.getFullYear() === year && recordDate.getMonth() + 1 === month;
    });

    // その月の日数を計算
    const lastDay = new Date(year, month, 0);
    const dayCount = lastDay.getDate();

    // 日付ごとに最大1RMを集計
    const dataByDate: { [key: string]: { date: string; max1RM: number | null; dateObj: Date } } = {};

    // 月内の全ての日付を初期化
    for (let i = 1; i <= dayCount; i++) {
      const currentDate = new Date(year, month - 1, i);
      const dateKey = `${month}/${i}`;
      dataByDate[dateKey] = {
        date: dateKey,
        max1RM: null,
        dateObj: currentDate,
      };
    }

    // 実際のデータで上書き
    filteredRecords.forEach((record) => {
      const recordDate = new Date(record.created_at);
      const dateKey = `${recordDate.getMonth() + 1}/${recordDate.getDate()}`;

      if (dataByDate[dateKey] && (dataByDate[dateKey].max1RM === null || dataByDate[dateKey].max1RM! < record.estimated_1rm)) {
        dataByDate[dateKey].max1RM = record.estimated_1rm;
      }
    });

    // データがある日だけをフィルタリング
    const allDates = Object.values(dataByDate).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    const chartArray = allDates
      .filter(d => d.max1RM !== null)
      .map(d => ({ date: d.date, max1RM: d.max1RM! }));

    // 最大値を計算してYAxisの上限を設定
    if (chartArray.length > 0) {
      const maxValue = Math.max(...chartArray.map(d => d.max1RM));
      setMaxYValue(Math.ceil(maxValue + 20));
    }

    setChartData(chartArray);
  };

  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedExercise && selectedYear && selectedMonth && records.length > 0) {
      prepareChartData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExercise, selectedYear, selectedMonth, records]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">読み込み中...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="container max-w-2xl mx-auto py-10 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              トレーニング記録
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">まだトレーニング記録がありません。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4 space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-6 h-6" />
            トレーニング記録
          </CardTitle>
        </CardHeader>
      </Card>

  

      {/* グラフ */}
      {selectedExercise && chartData.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <h3 className="text-lg font-semibold">
              {selectedExercise} - 推定最大挙上重量（1RM）の推移
            </h3>
          </div>
          <ChartContainer config={chartConfig} className="h-75 w-full">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value}kg`}
                domain={[0, maxYValue]}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => {
                      if (typeof value === 'number') {
                        return `${value.toFixed(1)} kg`;
                      }
                      return 'N/A';
                    }}
                  />
                }
              />
              <Line 
                type="linear" 
                dataKey="max1RM" 
                stroke="#000" 
                strokeWidth={3}
                dot={{ fill: '#000', r: 5, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        </div>
      )}

      {/* データがない場合 */}
      {selectedExercise && chartData.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              {selectedExercise}の記録がありません
            </p>
          </CardContent>
        </Card>
      )}


      {/* 種目選択と月選択 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">表示設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">種目</label>
            <Select value={selectedExercise} onValueChange={setSelectedExercise}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="種目を選択してください" />
              </SelectTrigger>
              <SelectContent>
                {exercises.map((exercise) => (
                  <SelectItem key={exercise} value={exercise}>
                    {exercise}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">表示年</label>
            <Select 
              value={selectedYear} 
              onValueChange={(year) => {
                setSelectedYear(year);
                // 年が変わったら、その年の最初の月を選択
                if (availableMonths[year] && availableMonths[year].length > 0) {
                  setSelectedMonth(availableMonths[year][0]);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="年を選択してください" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">表示月</label>
            <Select 
              value={selectedMonth} 
              onValueChange={setSelectedMonth}
              disabled={!selectedYear}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="月を選択してください" />
              </SelectTrigger>
              <SelectContent>
                {selectedYear && availableMonths[selectedYear]?.map((month) => (
                  <SelectItem key={month} value={month}>
                    {parseInt(month)}月
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      
    </div>
  );
}