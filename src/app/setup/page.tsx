"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import { X, Camera } from "lucide-react";

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
    speechStyle: "반말", 
    preferredCallSign: "이름",
    profileImage: "/default_avatar.png" // 기본 프사 적용
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const body = new FormData();
    body.append("file", file);

    try {
      const res = await fetch("/api/chat/image", {
        method: "POST",
        body
      });
      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, profileImage: data.imageUrl }));
      }
    } catch (err) {
      alert("이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
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
        router.push("/chats");
      } else {
        const data = await res.json();
        alert(data.error || "프로필 설정에 실패했습니다.");
      }
    } catch (err) {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 className={styles.title} style={{ margin: 0 }}>메이트 디자인하기 💖</h1>
        <Link href="/chats" style={{ color: '#333' }}>
          <X size={24} />
        </Link>
      </header>
      
      <p className={styles.subtitle}>새로운 메이트를 디자인합니다. (10,000 P 소모됨)</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* 프로필 이미지 섹션 */}
        <section className={styles.section} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', marginBottom: 15 }}>
            <img 
              src={formData.profileImage} 
              alt="preview" 
              style={{ width: 100, height: 100, borderRadius: 35, objectFit: 'cover', border: '2px solid #eee' }} 
            />
            <label style={{ position: 'absolute', bottom: 0, right: 0, background: '#fff', borderRadius: 20, padding: 8, cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
              <Camera size={18} />
              <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            </label>
          </div>
          <span style={{ fontSize: 13, color: '#888' }}>{uploading ? "업로드 중..." : "탭하여 프로필 사진 변경"}</span>
        </section>

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
        </section>

        <button type="submit" className={styles.button} disabled={loading || uploading}>
          {loading ? "메이트 생성 중..." : "결과 확인하고 채팅 시작"}
        </button>
      </form>
    </div>
  );
}
