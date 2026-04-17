"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";
import giftStyles from "./gift.module.css";
import { ChevronLeft, Info, Plus, Heart, Gift, X, Loader2, Settings2, Image as ImageIcon } from "lucide-react";
import { calculateDDay } from "@/lib/anniversaries";

interface Message {
  id: string;
  sender: "me" | "companion";
  text: string;
  time: string;
  isRead: boolean;
  imageUrl?: string;
}

const GIFT_LIST = [
  { id: "coffee", name: "아이스 아메리카노", price: 450, icon: "☕" },
  { id: "cake", name: "딸기 조각 케이크", price: 850, icon: "🍰" },
  { id: "flower", name: "장미 꽃다발", price: 3500, icon: "🌹" },
  { id: "ring", name: "커플링", price: 15000, icon: "💍" },
];

export default function ChatClient({ companion, initialMessages, userPoints: initialPoints }: any) {
  // 초기 메시지 중복 제거 후 상태 초기화
  const [messages, setMessages] = useState<Message[]>(() => {
    const seen = new Set();
    return initialMessages.filter((m: any) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    }).map((m: any) => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      isRead: m.isRead,
      imageUrl: m.imageUrl,
      time: new Date(m.createdAt).toLocaleTimeString("ko-KR", { 
        hour: "numeric", 
        minute: "2-digit" 
      })
    }));
  });
  const [isMounted, setIsMounted] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showDevMode, setShowDevMode] = useState(false); // 개발자 모드 토글
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [points, setPoints] = useState(initialPoints);
  const [intimacy, setIntimacy] = useState(companion.intimacy || 0); // 호감도 상태
  const [incomingQueue, setIncomingQueue] = useState<any[]>([]); // 도착한 메시지 대기열
  const [isProcessing, setIsProcessing] = useState(false); // 큐 처리 중 여부

  const chatAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dday = calculateDDay(companion.startedAt);

  useEffect(() => {
    setIsMounted(true);
    setMessages(initialMessages.map((m: any) => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      isRead: m.isRead,
      imageUrl: m.imageUrl,
      time: new Date(m.createdAt).toLocaleTimeString("ko-KR", { 
        hour: "numeric", 
        minute: "2-digit" 
      })
    })));
  }, [initialMessages]);

  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages, isAIThinking]);

  // --- 리얼 인터랙션 엔진: 큐 처리 로직 ---
  useEffect(() => {
    if (!isMounted || isProcessing || incomingQueue.length === 0) return;

    const processNextMessage = async () => {
      setIsProcessing(true);
      const nextMsg = incomingQueue[0];
      
      // 내 메시지의 '1'을 즉시 지움 (지수가 읽기 시작하자마자)
      setMessages((prev: Message[]) => prev.map(m => m.sender === "me" ? { ...m, isRead: true } : m));

      // 1. 읽기 단계: 첫 메시지는 길게, 연속된 메시지([SEP] 분할)는 아주 짧게
      const waitTime = isProcessing ? 500 : (1000 + Math.random() * 1500);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      // 2. 타이핑 단계: 짧은 문구는 더 빠르게 타이핑 연출
      setIsAIThinking(true);
      const typingTime = Math.min(4000, Math.max(800, nextMsg.text.length * 70)); 
      await new Promise(resolve => setTimeout(resolve, typingTime));

      // 3. 메시지 노출 (중복 ID 방어)
      setMessages((prev: Message[]) => {
        if (prev.some(m => m.id === nextMsg.id)) return prev;
        return [...prev, {
          ...nextMsg,
          time: new Date().toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })
        }];
      });
      
      setIsAIThinking(false);
      setIncomingQueue(prev => prev.slice(1));
      setIsProcessing(false);
    };

    processNextMessage();
  }, [incomingQueue, isProcessing, isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    const syncWithMate = async () => {
      try {
        const res = await fetch(`/api/chat/sync?companionId=${companion.id}&t=${Date.now()}`);
        if (!res.ok) return;
        
        const data = await res.json();
        
        if (data.currentIntimacy !== undefined) {
          setIntimacy(data.currentIntimacy);
        }

        if (data.hasUpdate && data.newMessages?.length > 0) {
          // 큐에 추가할 때, 현재 메시지 목록(prevMessages)과 비교하여 중복 제거
          setIncomingQueue(prevQueue => {
            // 현재 메시지 상태를 직접 가져올 수 없으므로, 
            // 큐에 넣기 전에는 ID 리스트만 관리하거나, 렌더링 시점에 최종 필터링을 하도록 로직 보강
            const newItems = data.newMessages.filter((nm: any) => 
              !prevQueue.some(p => p.id === nm.id)
            );
            return [...prevQueue, ...newItems];
          });
        }
      } catch (err) {
        console.error("Sync failed", err);
      }
    };

    const interval = setInterval(syncWithMate, 4000);
    return () => clearInterval(interval);
  }, [isMounted, companion.id]); // messages 의존성 제거

  const handleUpdateStats = async (newIntimacy?: number, newPoints?: number) => {
    try {
      const res = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companionId: companion.id,
          intimacy: newIntimacy,
          points: newPoints
        }),
      });
      if (res.ok) {
        if (newIntimacy !== undefined) setIntimacy(newIntimacy);
        if (newPoints !== undefined) setPoints(newPoints);
      }
    } catch (err) {
      console.error("Failed to update stats", err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPaymentLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("companionId", companion.id);

    try {
      const res = await fetch("/api/chat/image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setMessages(prev => [...prev, {
          id: "img-" + Date.now(),
          sender: "me",
          text: "",
          imageUrl: data.imageUrl,
          isRead: false,
          time: new Date().toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })
        }]);
        setIsAIThinking(true);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("사진 전송에 실패했습니다.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const now = new Date();
    const tempId = "temp-" + Date.now();
    const newMsg: Message = {
      id: tempId,
      sender: "me",
      text: inputText,
      isRead: false,
      time: now.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsAIThinking(true);
    setInputText("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMsg.text, companionId: companion.id }),
      });
      
      if (!response.ok) {
        // 서버 저장 실패 시 로컬에서 삭제 혹은 오류 표시
        alert("서버에 메시지를 저장하지 못했습니다. 다시 시도해 주세요.");
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch (err) {
      console.error("Failed to send message", err);
      alert("네트워크 오류가 발생했습니다.");
    }
  };

  const handleSendGift = async (gift: any) => {
    if (points < gift.price) {
      alert("포인트가 부족해요!");
      return;
    }

    setPaymentLoading(true); // 결제 중 팝업 시작
    setShowGiftModal(false);

    try {
      const res = await fetch("/api/chat/gift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          giftId: gift.id,
          giftName: gift.name,
          points: gift.price,
          companionId: companion.id
        }),
      });
      const data = await res.json();

      if (data.success) {
        setPoints((prev: number) => prev - gift.price);
        setMessages((prev: Message[]) => [
          ...prev,
          { 
            id: "gift-me-" + Date.now(), 
            sender: "me", 
            text: `🎁 [선물 전송] ${gift.name}`, 
            isRead: true,
            time: new Date().toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" }) 
          }
        ]);
        // 답장은 sync API가 처리하므로 즉시 thinking 상태만 켬
        setIsAIThinking(true);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("선물 보내기에 실패했어요.");
    } finally {
      setTimeout(() => setPaymentLoading(false), 800); // 연출을 위해 약간의 지연 후 닫기
    }
  };

  const profileImage = companion.gender === 'male'
    ? "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80"
    : "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80";

  if (!isMounted) return null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <ChevronLeft className={styles.icon} onClick={() => window.location.href='/chats'} />
          <img src={profileImage} alt="profile" className={styles.headerProfilePic} />
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span>{companion.name}</span>
            <span className={giftStyles.ddayBadge}>D+{dday}</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '8px' }}>
            <span style={{ fontSize: '0.7rem', color: '#888' }}>보유 포인트</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#7A28CB' }}>{points.toLocaleString()}P</span>
          </div>
          <Settings2 
            className={`${styles.icon} ${showDevMode ? styles.activeIcon : ""}`} 
            size={22} 
            onClick={() => setShowDevMode(!showDevMode)} 
          />
        </div>
      </header>

      <div className={styles.chatArea} ref={chatAreaRef}>
        <div className={styles.dateSeparator}>
          <span className={styles.dateBadge}>
            {new Date().toLocaleDateString("ko-KR", { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </span>
        </div>
        {messages.map((msg, index) => {
          const isGift = msg.text.startsWith("🎁 [선물 전송]");
          const giftName = isGift ? msg.text.replace("🎁 [선물 전송] ", "") : "";
          const nextMsg = messages[index + 1];
          const showTime = !nextMsg || nextMsg.sender !== msg.sender || nextMsg.time !== msg.time;

          return (
            <div key={msg.id} className={`${styles.messageRow} ${styles[msg.sender]}`}>
              {msg.sender === "companion" && (
                <img src={profileImage} alt="profile" className={styles.profilePic} />
              )}
              <div className={styles.messageContent}>
                <div className={styles.bubbleWrapper}>
                  {isGift ? (
                    <div className={giftStyles.giftMessageBubble}>
                      <div className={giftStyles.giftHeader}>Gift</div>
                      <div className={giftStyles.giftBody}>
                        <div className={giftStyles.giftThumb}>🎁</div>
                        <div className={giftStyles.giftInfo}>
                          <div className={giftStyles.giftTitle}>{giftName}</div>
                          <div className={giftStyles.giftStatus}>선물 전송 완료</div>
                        </div>
                      </div>
                    </div>
                  ) : msg.imageUrl ? (
                    <div className={styles.imageBubble}>
                      <img src={msg.imageUrl} alt="sent" className={styles.sentImage} />
                    </div>
                  ) : (
                    <div className={styles.bubble}>{msg.text}</div>
                  )}
                  <div className={styles.timeWrapper}>
                    {msg.sender === "me" && !msg.isRead && (
                      <span className={styles.unreadStatus}>1</span>
                    )}
                    {showTime && <div className={styles.time}>{msg.time}</div>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {isAIThinking && messages.every(m => m.sender !== "me" || m.isRead) && (
          <div className={`${styles.messageRow} ${styles.companion}`}>
            <img src={profileImage} alt="profile" className={styles.profilePic} />
            <div className={styles.messageContent}>
              <div className={styles.bubbleWrapper}>
                <div className={`${styles.bubble} ${styles.loadingBubble}`}>
                  <div className={styles.typingIndicator}><div className={styles.dot}></div><div className={styles.dot}></div><div className={styles.dot}></div></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.inputArea}>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*" 
          onChange={handlePhotoUpload} 
        />
        <div className={styles.toolIcon} onClick={() => fileInputRef.current?.click()}>
          <ImageIcon size={20} color="#7A28CB" />
        </div>
        <div className={styles.toolIcon} onClick={() => setShowGiftModal(true)}>
          <Gift size={20} color="#FF007F" />
        </div>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            className={styles.input}
            placeholder="메시지 입력..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()}
          />
          {inputText.trim() ? (
            <button className={styles.sendButton} onClick={handleSend}>보내기</button>
          ) : (
            <Heart size={20} color="#FF007F" style={{ cursor: 'pointer' }} />
          )}
        </div>
      </div>

      {/* 개발자 모드 플로팅 패널 */}
      {showDevMode && (
        <div className={styles.devPanel}>
          <div className={styles.devHeader}>
            <span>Dev Mode (Stats)</span>
            <X size={16} onClick={() => setShowDevMode(false)} />
          </div>
          <div className={styles.devContent}>
            <div className={styles.devItem}>
              <span>호감도: {intimacy}</span>
              <div className={styles.devButtons}>
                <button onClick={() => handleUpdateStats(intimacy - 10)}>-10</button>
                <button onClick={() => handleUpdateStats(intimacy + 10)}>+10</button>
              </div>
            </div>
            <div className={styles.devItem}>
              <span>포인트: {points.toLocaleString()}</span>
              <div className={styles.devButtons}>
                <button onClick={() => handleUpdateStats(undefined, points - 1000)}>-1K</button>
                <button onClick={() => handleUpdateStats(undefined, points + 1000)}>+1K</button>
              </div>
            </div>
            <p style={{ fontSize: '0.65rem', color: '#888', marginTop: '8px' }}>
              *호감도가 높을수록 더 깊고 솔직한 대화가 가능해집니다.
            </p>
          </div>
        </div>
      )}

      {showGiftModal && (
        <div className={giftStyles.modalOverlay} onClick={() => setShowGiftModal(false)}>
          <div className={giftStyles.modal} onClick={e => e.stopPropagation()}>
            <div className={giftStyles.modalHeader}>
              <span className={giftStyles.modalTitle}>기프티콘 선물하기</span>
              <X size={24} onClick={() => setShowGiftModal(false)} style={{ cursor: 'pointer' }} />
            </div>
            <div className={giftStyles.userPoints}>나의 포인트: {points.toLocaleString()}P</div>
            <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '16px' }}>(1P = 10원 상당)</p>
            <div className={giftStyles.giftGrid}>
              {GIFT_LIST.map(gift => (
                <div key={gift.id} className={giftStyles.giftItem} onClick={() => handleSendGift(gift)}>
                  <span className={giftStyles.giftIcon}>{gift.icon}</span>
                  <span className={giftStyles.giftName}>{gift.name}</span>
                  <span className={giftStyles.giftPrice}>{gift.price.toLocaleString()}P</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 결제 중 팝업 */}
      {paymentLoading && (
        <div className={giftStyles.modalOverlay} style={{ zIndex: 3000, background: 'rgba(0,0,0,0.5)' }}>
          <div className={giftStyles.paymentLoadingBox}>
            <Loader2 className={giftStyles.spin} size={40} color="#FF007F" />
            <p style={{ marginTop: '16px', fontWeight: 600, color: '#333' }}>결제 중..</p>
          </div>
        </div>
      )}
    </div>
  );
}
