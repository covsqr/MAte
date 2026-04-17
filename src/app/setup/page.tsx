"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function SetupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    userName: "사용자",
    name: "지수",
    age: "23",
    gender: "female",
    mbti: "ENFP",
    personality: "다정하고 장난끼 많은 성격. 가끔 엉뚱하다.",
    interests: "카페 투어, 넷플릭스 탐방, 사진 찍기",
    relationship: "연인",
    birthday: "05-20"
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        // 성공 시 메인 채팅창으로
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
      <h1 className={styles.title}>내 메이트 만들기 💖</h1>
      <p className={styles.subtitle}>대화할 상대방의 성향을 디자인해주세요.</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className={styles.formGroup}>
          <label className={styles.label}>내 이름 (유저명)</label>
          <input className={styles.input} name="userName" value={formData.userName} onChange={handleChange} required />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>메이트 이름</label>
          <input className={styles.input} name="name" value={formData.name} onChange={handleChange} required />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>성별</label>
          <select className={styles.select} name="gender" value={formData.gender} onChange={handleChange}>
            <option value="female">여성</option>
            <option value="male">남성</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>나이</label>
          <input type="number" className={styles.input} name="age" value={formData.age} onChange={handleChange} required />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>MBTI</label>
          <input className={styles.input} name="mbti" placeholder="예: INFP" value={formData.mbti} onChange={handleChange} required />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>성격 (구체적으로)</label>
          <input className={styles.input} name="personality" placeholder="예: 무뚝뚝하지만 뒤에서 챙겨줌" value={formData.personality} onChange={handleChange} required />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>주요 관심사</label>
          <input className={styles.input} name="interests" placeholder="예: 게임, 요리, 산책" value={formData.interests} onChange={handleChange} required />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>메이트 생일 (MM-DD)</label>
          <input className={styles.input} name="birthday" placeholder="예: 05-20" value={formData.birthday} onChange={handleChange} required />
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

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? "설정 중..." : "설정 완료하고 채팅 시작"}
        </button>
      </form>
    </div>
  );
}
