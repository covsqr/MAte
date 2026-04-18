import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "./recharge.module.css";
import { ChevronLeft, CreditCard, MessageCircle, User } from "lucide-react";

export default async function RechargePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  });

  if (!user) redirect("/login");

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/chats">
          <ChevronLeft className={styles.icon} />
        </Link>
        <span className={styles.title}>포인트 충전</span>
        <div style={{ width: 24 }} />
      </header>

      <div className={styles.content}>
        <div className={styles.userCard}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user.name || "사용자"} 님</span>
            <span className={styles.userPoints}>{user.points.toLocaleString()} P</span>
          </div>
          <p className={styles.pointSub}>선물하기와 대화를 지속하기 위해 포인트가 필요합니다.</p>
        </div>

        <h3 className={styles.sectionTitle}>충전 금액 선택</h3>
        <div className={styles.priceGrid}>
          {[
            { p: 1000, price: "10,000원", bonus: "+100 bonus" },
            { p: 3000, price: "30,000원", bonus: "+500 bonus" },
            { p: 5000, price: "50,000원", bonus: "+1,000 bonus" },
            { p: 10000, price: "100,000원", bonus: "+3,000 bonus" },
          ].map((item, idx) => (
            <div key={idx} className={styles.priceItem}>
              <div className={styles.priceInfo}>
                <span className={styles.pAmount}>{item.p.toLocaleString()} P</span>
                <span className={styles.pBonus}>{item.bonus}</span>
              </div>
              <button className={styles.buyBtn}>{item.price}</button>
            </div>
          ))}
        </div>

        <div className={styles.paymentMethod}>
          <p className={styles.sectionTitle}>결제 수단</p>
          <div className={styles.methodList}>
            <div className={styles.methodItemActive}>
              <CreditCard size={20} />
              <span>신용/체크카드</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
