"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function BackgroundPoller() {
  const pathname = usePathname();
  const router = useRouter();
  const lastSyncRef = useRef<number>(0);

  useEffect(() => {
    // 7~10초 사이의 랜덤한 주기 설정을 위한 함수
    const getRandomInterval = () => Math.floor(Math.random() * (10000 - 7000 + 1) + 7000);

    const syncGlobal = async () => {
      // 현재 채팅방(/) 내부라면 이미 ChatClient에서 폴링 중이므로 중복 호출 방지
      // (단, ChatClient가 없을 때를 대비해 pathname으로 구분)
      if (pathname === "/") return;

      try {
        const res = await fetch(`/api/chat/sync?t=${Date.now()}`);
        if (!res.ok) return;
        
        const data = await res.json();
        
        // 새로운 메시지나 업데이트가 있다면 서버 컴포넌트(채팅 목록 등)를 갱신
        if (data.hasUpdate) {
          router.refresh(); 
        }
      } catch (err) {
        // ignore
      }
    };

    const runPoller = () => {
      syncGlobal();
      const nextInterval = getRandomInterval();
      const timerId = setTimeout(runPoller, nextInterval);
      return timerId;
    };

    const timerId = runPoller();
    return () => clearTimeout(timerId);
  }, [pathname, router]);

  return null;
}
