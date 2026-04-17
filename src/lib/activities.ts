export interface Activity {
  name: string;
  description: string;
  mood: string;
}

export function getCurrentActivity(time: Date, mbti: string): Activity {
  const hour = time.getHours();
  const day = time.getDay(); // 0 (Sun) to 6 (Sat)
  const isWeekend = day === 0 || day === 6;

  // Basic Life Schedule
  if (hour >= 0 && hour < 8) {
    return { name: "잠자리", description: "곤히 자는 중", mood: "졸음" };
  }
  
  if (isWeekend) {
    if (hour >= 8 && hour < 11) {
      return { name: "늦잠", description: "침대에서 뒹굴거리는 중", mood: "여유" };
    }
    if (hour >= 11 && hour < 14) {
      return { name: "외출 준비", description: "친구들 만날 준비 하는 중", mood: "설렘" };
    }
    if (hour >= 14 && hour < 19) {
      return { name: "친구와 카페", description: "친구들이랑 수다 떨고 인스타 사진 찍는 중", mood: "신남" };
    }
    return { name: "집에서 휴식", description: "유튜브 보면서 쉬는 중", mood: "편안" };
  } else {
    // Weekday
    if (hour >= 8 && hour < 9) {
      return { name: "등교/출근 중", description: "지하철 타고 이동 중", mood: "피곤" };
    }
    if (hour >= 9 && hour < 16) {
      return { name: "수업/업무", description: "열심히 집중해서 할 일 하는 중", mood: "바쁨" };
    }
    if (hour >= 16 && hour < 18) {
      return { name: "운동/스터디", description: "자기계발 하는 중", mood: "열중" };
    }
    // Special Event: Wednesday/Friday Part-time job
    if ((day === 3 || day === 5) && hour >= 18 && hour < 22) {
      return { name: "편의점 알바", description: "손님 응대하고 재고 정리하는 중", mood: "정신없음" };
    }
    return { name: "자유 시간", description: "저녁 먹고 쉬거나 친구랑 연락하는 중", mood: "심심" };
  }
}
