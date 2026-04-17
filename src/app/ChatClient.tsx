"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";
import giftStyles from "./gift.module.css";
import { ChevronLeft, Info, Plus, Heart, Gift, X, Loader2 } from "lucide-react";
import { calculateDDay } from "@/lib/anniversaries";

interface Message {
  id: string;
  sender: "me" | "companion";
  text: string;
  time: string;
  isRead: boolean;
}

const GIFT_LIST = [
  { id: "coffee", name: "아이스 아메리카노", price: 450, icon: "☕" },
  { id: "cake", name: "딸기 조각 케이크", price: 850, icon: "🍰" },
  { id: "flower", name: "장미 꽃다발", price: 3500, icon: "🌹" },
  { id: "ring", name: "커플링", price: 15000, icon: "💍" },
];

export default function ChatClient({ companion, initialMessages, userPoints: initialPoints }: any) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false); // 결제 중 팝업 상태
  const [points, setPoints] = useState(initialPoints);
  const chatAreaRef = useRef<HTMLDivElement>(null);

  const dday = calculateDDay(companion.startedAt);

  useEffect(() => {
    setIsMounted(true);
    setMessages(initialMessages.map((m: any) => ({
      id: m.id,
      sender: m.sender,
      text: m.text,
      isRead: m.isRead,
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

  useEffect(() => {
    if (!isMounted) return;

    const syncWithMate = async () => {
      try {
        const res = await fetch(`/api/chat/sync?companionId=${companion.id}&t=${Date.now()}`);
        if (!res.ok) return;
        
        const data = await res.json();
        
        if (data.hasUpdate) {
          if (data.readUpdated) {
            setMessages(prev => prev.map(m => m.sender === "me" ? { ...m, isRead: true } : m));
          }
          if (data.newMessages && data.newMessages.length > 0) {
            const newMsgs = data.newMessages.filter((nm: any) => !messages.some(m => m.id === nm.id));
            if (newMsgs.length > 0) {
                setMessages(prev => [...prev, ...newMsgs.map((nm: any) => ({ ...nm, isRead: true }))]);
                setIsAIThinking(false);
            }
          }
        }
      } catch (err) {
        console.error("Sync failed", err);
      }
    };

    const interval = setInterval(syncWithMate, 5000);
    return () => clearInterval(interval);
  }, [isMounted, companion.id]);

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
        setPoints(prev => prev - gift.price);
        setMessages(prev => [
          ...prev,
          { 
            id: "gift-me-" + Date.now(), 
            sender: "me", 
            text: `🎁 [선물 전송] ${gift.name}`, 
            isRead: false,
            time: new Date().toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" }) 
          }
        ]);
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
          <ChevronLeft className={styles.icon} />
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
          <Info className={styles.icon} size={22} />
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
