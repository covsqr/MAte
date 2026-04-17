"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function SetupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    // 내 프로필
    userName: "사용자",
    userAge: "25",
    userLocation: "서울",
    userHobbies: "컴퓨터 게임, 카페 탐방",

    // 메이트 프로필
    name: "지수",
    age: "23",
    gender: "female",
    mbti: "ENFP",
    personality: "다정하고 장난끼 많은 성격. 가끔 엉뚱하다.",
    interests: "카페 투어, 넷플릭스 탐방, 사진 찍기",
    relationship: "연인",
    birthday: "05-20",
    speechStyle: "반말", // "반말" or "존댓말"
    preferredCallSign: "이름" // "이름", "자기야", "여보야", "오빠", "(이름)오빠"
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        router.push("/");
      } else if (res.status === 401) {
        alert("세션이 만료되었습니다. 다시 가입해 주세요.");
        router.push("/signup");
      } else {
        alert("프로필 설정에 실패했습니다.");
      }
    } catch (err) {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>내 메이트 디자인하기 💖</h1>
      <p className={styles.subtitle}>두 분의 설정을 입력해주세요. 메이트가 이 내용을 기억할 거예요.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>👤 내 프로필 (유저 정보)</h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>이름</label>
              <input className={styles.input} name="userName" value={formData.userName} onChange={handleChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>나이</label>
              <input type="number" className={styles.input} name="userAge" value={formData.userAge} onChange={handleChange} required />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>거주 지역</label>
            <input className={styles.input} name="userLocation" placeholder="예: 서울 강남구" value={formData.userLocation} onChange={handleChange} required />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>나의 취미</label>
            <input className={styles.input} name="userHobbies" value={formData.userHobbies} onChange={handleChange} placeholder="메이트와 공유할 취미를 적어주세요" required />
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>✨ 메이트 설정</h2>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>이름</label>
              <input className={styles.input} name="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>나이</label>
              <input type="number" className={styles.input} name="age" value={formData.age} onChange={handleChange} required />
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>성별</label>
              <select className={styles.select} name="gender" value={formData.gender} onChange={handleChange}>
                <option value="female">여성</option>
                <option value="male">남성</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>어투 (말투)</label>
              <select className={styles.select} name="speechStyle" value={formData.speechStyle} onChange={handleChange}>
                <option value="반말">친근한 반말</option>
                <option value="존댓말">다정한 존댓말</option>
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>나를 부를 호칭</label>
            <select className={styles.select} name="preferredCallSign" value={formData.preferredCallSign} onChange={handleChange}>
              <option value="이름">이름 (예: 준서야)</option>
              <option value="자기야">자기야</option>
              <option value="여보야">여보야</option>
              <option value="오빠">오빠</option>
              <option value="(이름)오빠">(이름)오빠 (예: 준서오빠)</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>MBTI</label>
            <input className={styles.input} name="mbti" placeholder="예: INFP" value={formData.mbti} onChange={handleChange} required />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>나와의 관계</label>
            <select className={styles.select} name="relationship" value={formData.relationship} onChange={handleChange}>
              <option value="썸">썸 타는 사이</option>
              <option value="연인">달달한 연인</option>
              <option value="오랜 연인">오래되어 편안한 연인</option>
              <option value="선후배">가까운 선후배</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>성격</label>
            <input className={styles.input} name="personality" placeholder="예: 다정하지만 가끔 츤데레" value={formData.personality} onChange={handleChange} required />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>메이트의 관심사</label>
            <input className={styles.input} name="interests" placeholder="예: 요리, 발레, 강아지" value={formData.interests} onChange={handleChange} required />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>메이트 생일 (MM-DD)</label>
            <input className={styles.input} name="birthday" placeholder="예: 05-20" value={formData.birthday} onChange={handleChange} required />
          </div>
        </section>

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? "메이트 생성 중..." : "설정 완료하고 채팅 시작"}
        </button>
      </form>
    </div>
  );
}
