"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../setup/page.module.css";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/");
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>MAte 로그인 💖</h1>
      <p className={styles.subtitle}>메이트가 당신을 기다리고 있어요.</p>

      {error && <p style={{ color: 'red', marginBottom: '16px' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
        <div className={styles.formGroup}>
          <label className={styles.label}>아이디</label>
          <input className={styles.input} name="username" value={formData.username} onChange={handleChange} required />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>비밀번호</label>
          <input className={styles.input} type="password" name="password" value={formData.password} onChange={handleChange} required />
        </div>

        <button type="submit" className={styles.button} disabled={loading}>
          {loading ? "로그인 중..." : "로그인"}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#666' }}>
          계정이 없으신가요? <Link href="/signup" style={{ color: '#7A28CB', fontWeight: 600 }}>회원가입</Link>
        </p>
      </form>
    </div>
  );
}
