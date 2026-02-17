export type Exercise = {
  name: string;
  weight: number;
  reps: number;
  sets: number;
  rest: number;
};

export type Day = {
  dayIndex: number;
  menu: Exercise[];
};

export type Week = {
  week: number;
  days: Day[];
};

export type RoadmapData = {
  explanation: string;
  totalWeeks: number;
  frequencyPerWeek: number;
  roadmap: Week[];
};
