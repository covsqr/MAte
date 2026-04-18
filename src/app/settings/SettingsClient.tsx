"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./settings.module.css";
import { 
  ChevronLeft, 
  MessageCircle, 
  Settings, 
  User, 
  Lock, 
  CreditCard, 
  Database,
  LogOut,
  ChevronRight,
  Heart,
  Trash2,
  Camera
} from "lucide-react";

export default function SettingsClient({ user, companions: initialCompanions }: any) {
  const router = useRouter();
  const [companions, setCompanions] = useState(initialCompanions);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: "", new: "" });
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (!confirm("정말 로그아웃 하시겠습니까?")) return;
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      alert("로그아웃에 실패했습니다.");
    }
  };

  const handleCreateMate = async () => {
    if (confirm("새로운 메이트를 디자인하시겠습니까?\n이 작업은 10,000 포인트가 즉시 소모됩니다.\n(입력 중 취소해도 포인트는 반환되지 않습니다)")) {
      try {
        const res = await fetch("/api/companion/prepay", { method: "POST" });
        if (res.ok) {
          router.push("/setup");
        } else {
          const data = await res.json();
          alert(data.error || "포인트 차감에 실패했습니다.");
        }
      } catch (err) {
        alert("통신 오류가 발생했습니다.");
      }
    }
  };

  const handleClearHistory = async (companionId: string, name: string) => {
    if (confirm(`[${name}]님과의 모든 대화 기록을 초기화하시겠습니까?\n이 작업은 되돌릴 수 없으며, 기존에 사용한 포인트는 반환되지 않습니다.`)) {
      try {
        const res = await fetch("/api/chat/clear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companionId })
        });
        if (res.ok) {
          alert("대화 기록이 초기화되었습니다.");
          router.refresh();
        }
      } catch (err) {
        alert("초기화 실패");
      }
    }
  };

  const handleUpdateProfileImage = async (companionId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('companionId', companionId);
      formData.append('type', 'profile');

      try {
        const res = await fetch("/api/chat/image", {
          method: "POST",
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          // 로컬 상태 즉시 갱신 (캐시 방지를 위해 timestamp 추가)
          setCompanions((prev: any) => prev.map((c: any) => 
            c.id === companionId ? { ...c, profileImage: `${data.imageUrl}?t=${Date.now()}` } : c
          ));
          alert("프로필 이미지가 변경되었습니다.");
          router.refresh();
        }
      } catch (err) {
        alert("이미지 업로드 실패");
      }
    };
    input.click();
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: pwdForm.current,
          newPassword: pwdForm.new
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert("비밀번호가 변경되었습니다.");
        setShowPasswordForm(false);
        setPwdForm({ current: "", new: "" });
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("변경 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAdminStats = async (type: 'points' | 'intimacy', value: string, companionId?: string) => {
    const newVal = prompt(`${type} 수정`, value);
    if (newVal === null) return;

    try {
      const res = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companionId,
          [type]: newVal
        })
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (err) {
      alert("수정 실패");
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/chats">
          <ChevronLeft className={styles.icon} />
        </Link>
        <span className={styles.title}>더보기</span>
        <div style={{ width: 24 }} />
      </header>

      <div className={styles.content}>
        {/* 프로필 및 포인트 섹션 */}
        <section className={styles.section}>
          <div className={styles.userProfile}>
            <div style={{ width: 50, height: 50, borderRadius: 25, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={30} color="#888" />
            </div>
            <div>
              <div className={styles.userName}>{user.name} 님</div>
              <div style={{ fontSize: 13, color: '#888' }}>{user.userId}</div>
            </div>
          </div>
          <div className={styles.pointRow}>
            <div>
              <span style={{ fontSize: 13, color: '#888' }}>보유 포인트</span>
              <div className={styles.currentPoints} onClick={() => handleUpdateAdminStats('points', user.points.toString())}>
                {user.points.toLocaleString()} P
              </div>
            </div>
            <Link href="/recharge" className={styles.rechargeBtn}>충전하기</Link>
          </div>
        </section>

        {/* 계정 보안 섹션 */}
        <div className={styles.sectionTitle}>계정 설정</div>
        <section className={styles.section}>
          <div className={styles.menuItem} onClick={() => setShowPasswordForm(!showPasswordForm)}>
            <div className={styles.menuLabel}>
              <Lock size={18} />
              <span>비밀번호 변경</span>
            </div>
            <ChevronRight size={18} color="#ccc" />
          </div>
          
          {showPasswordForm && (
            <form onSubmit={handlePasswordChange} className={styles.formGroup}>
              <input 
                type="password" 
                placeholder="현재 비밀번호" 
                className={styles.input} 
                value={pwdForm.current}
                onChange={e => setPwdForm({...pwdForm, current: e.target.value})}
                required
              />
              <input 
                type="password" 
                placeholder="새 비밀번호" 
                className={styles.input} 
                value={pwdForm.new}
                onChange={e => setPwdForm({...pwdForm, new: e.target.value})}
                required
              />
              <button type="submit" className={styles.saveBtn} disabled={loading}>
                {loading ? "처리 중..." : "변경 내용 저장"}
              </button>
            </form>
          )}
        </section>

        {/* 메이트 관리 */}
        <div className={styles.sectionTitle}>메이트 관리</div>
        <section className={styles.section}>
          {companions.map((comp: any) => (
            <div key={comp.id} style={{ borderBottom: '1px solid #f9f9f9', paddingBottom: 15, marginBottom: 15 }}>
              <div className={styles.menuItem}>
                <div className={styles.menuLabel} onClick={() => handleUpdateProfileImage(comp.id)}>
                   <div style={{ position: 'relative' }}>
                    <img 
                      src={comp.profileImage || "/default_avatar.png"} 
                      alt="p" 
                      style={{ width: 40, height: 40, borderRadius: 15, objectFit: 'cover' }} 
                    />
                    <div style={{ position: 'absolute', bottom: -2, right: -2, background: '#fff', borderRadius: 10, padding: 2, border: '1px solid #eee' }}>
                      <Camera size={10} color="#666" />
                    </div>
                   </div>
                   <div>
                    <div style={{ fontWeight: 600 }}>{comp.name}</div>
                    <div style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center' }}>
                       <Heart size={12} color="#ff4d4f" fill="#ff4d4f" style={{ marginRight: 4 }} />
                       {comp.intimacy}
                    </div>
                   </div>
                </div>
                <button 
                  onClick={() => handleClearHistory(comp.id, comp.name)}
                  style={{ background: 'none', border: '1px solid #ff4d4f', color: '#ff4d4f', padding: '4px 8px', borderRadius: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Trash2 size={12} /> 초기화
                </button>
              </div>
            </div>
          ))}
          
          <div className={styles.menuItem} onClick={handleCreateMate} style={{ cursor: 'pointer' }}>
            <div className={styles.menuLabel}>
              <Database size={18} />
              <span>새 메이트 디자인하기 (10,000 P)</span>
            </div>
            <ChevronRight size={18} color="#ccc" />
          </div>
        </section>

        <button className={styles.logoutBtn} onClick={handleLogout}>
          로그아웃
        </button>
      </div>
    </div>
  );
}
