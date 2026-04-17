"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import styles from "./page.module.css";
import { ChevronLeft, Info, Plus, Heart, Gift } from "lucide-react";

interface Message {
  id: string;
  sender: "me" | "companion";
  text: string;
  time: string;
}

export default function ChatClient({ companion, initialMessages }: any) {
  // DB의 시간 텍스트 변환
  const mappedMessages = initialMessages.map((m: any) => ({
    id: m.id,
    sender: m.sender,
    text: m.text,
    time: new Date(m.createdAt).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })
  }));

  const [messages, setMessages] = useState<Message[]>(mappedMessages.length > 0 ? mappedMessages : [
    {
      id: "sys-1",
      sender: "companion",
      text: `${companion.name} 프로필 설정 완료! 이제 대화를 시작해보세요.`,
      time: new Date().toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" }),
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Polling for proactive messages (sun-tok)
  useEffect(() => {
    const checkProactive = async () => {
      try {
        const res = await fetch("/api/chat/check");
        const data = await res.json();
        if (data.hasNewMessage) {
          setMessages(prev => [...prev, data.message]);
        }
      } catch (err) {
        console.error("Failed to check proactive messages", err);
      }
    };

    const interval = setInterval(checkProactive, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const newMsg: Message = {
      id: "temp-" + Date.now().toString(),
      sender: "me",
      text: inputText,
      time: new Date().toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: newMsg.text, companionId: companion.id }),
      });

      const data = await response.json();
      
      const replyMsg: Message = {
        id: "temp-" + (Date.now() + 1).toString(),
        sender: "companion",
        text: data.reply || "응답을 처리할 수 없습니다.",
        time: new Date().toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, replyMsg]);
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      handleSend();
    }
  };

  const profileImage = companion.gender === 'male' 
    ? "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80"
    : "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80";

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <ChevronLeft className={styles.icon} />
          <img src={profileImage} alt="profile" className={styles.headerProfilePic} />
          <span>{companion.name}</span>
        </div>
        <div className={styles.headerRight}>
          <Gift className={styles.icon} size={22} color="#FF007F" />
          <Info className={styles.icon} size={22} />
        </div>
      </header>

      {/* Chat Area */}
      <div className={styles.chatArea} ref={chatAreaRef}>
        <div className={styles.dateSeparator}>
          <span className={styles.dateBadge}>
            {new Date().toLocaleDateString("ko-KR", { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </span>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`${styles.messageRow} ${styles[msg.sender]}`}>
            {msg.sender === "companion" && (
              <img src={profileImage} alt="profile" className={styles.profilePic} />
            )}
            <div className={styles.messageContent}>
              <div className={styles.bubbleWrapper}>
                <div className={styles.bubble}>{msg.text}</div>
                <div className={styles.time}>{msg.time}</div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className={`${styles.messageRow} ${styles.companion}`}>
            <img src={profileImage} alt="profile" className={styles.profilePic} />
            <div className={styles.messageContent}>
               <div className={styles.bubbleWrapper}>
                 <div className={`${styles.bubble} ${styles.loadingBubble}`}>
                   <div className={styles.typingIndicator}>
                     <div className={styles.dot}></div>
                     <div className={styles.dot}></div>
                     <div className={styles.dot}></div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className={styles.inputArea}>
        <div className={styles.toolIcon}>
          <Plus size={20} />
        </div>
        <div className={styles.inputWrapper}>
          <input
            type="text"
            className={styles.input}
            placeholder="메시지 입력..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {inputText.trim() ? (
            <button 
              className={styles.sendButton} 
              onClick={handleSend}
              disabled={isLoading}
            >
              보내기
            </button>
          ) : (
            <Heart size={20} color="#FF007F" style={{ cursor: 'pointer' }} />
          )}
        </div>
      </div>
    </div>
  );
}
