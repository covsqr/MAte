export function calculateDDay(startDate: Date): number {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const diffTime = Math.abs(now.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 1일차부터 시작
  
  return diffDays;
}

export function isSpecialDay(birthday: string | null): string | null {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const todayStr = `${month}-${day}`;

  if (birthday === todayStr) return "생일";
  if (todayStr === "12-25") return "크리스마스";
  if (todayStr === "01-01") return "새해";
  if (todayStr === "02-14") return "발렌타인데이";
  
  return null;
}
