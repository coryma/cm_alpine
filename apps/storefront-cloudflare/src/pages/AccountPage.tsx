import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { AccountPageContent } from "../../shared/contracts";
import { formatCurrency } from "../lib/cartStore";
import {
  createManagedMember,
  listManagedMembers,
  logoutMember,
  type MemberProfile
} from "../lib/memberStore";
import { listOrdersForMember } from "../lib/orderStore";

interface AccountPageProps {
  cartItemCount: number;
  member: MemberProfile | null;
  onNavigate: (href: string) => void;
  page: AccountPageContent;
}

interface ManagedMemberFormState {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

const INITIAL_MANAGED_MEMBER_FORM: ManagedMemberFormState = {
  fullName: "",
  email: "",
  phone: "",
  password: ""
};

export function AccountPage({
  cartItemCount,
  member,
  onNavigate,
  page
}: AccountPageProps) {
  const [managedMembers, setManagedMembers] = useState<MemberProfile[]>([]);
  const [managedMemberForm, setManagedMemberForm] = useState<ManagedMemberFormState>(
    INITIAL_MANAGED_MEMBER_FORM
  );
  const [memberManagementError, setMemberManagementError] = useState("");
  const [memberManagementNotice, setMemberManagementNotice] = useState("");
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSavingManagedMember, setIsSavingManagedMember] = useState(false);
  const isAdmin = Boolean(member?.isAdmin);
  const orders = member ? listOrdersForMember(member) : [];

  useEffect(() => {
    let active = true;

    if (!isAdmin) {
      setManagedMembers([]);
      setMemberManagementError("");
      setMemberManagementNotice("");
      return () => {
        active = false;
      };
    }

    setIsLoadingMembers(true);
    setMemberManagementError("");

    listManagedMembers()
      .then((nextMembers) => {
        if (!active) {
          return;
        }

        setManagedMembers(nextMembers);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setMemberManagementError(
          error instanceof Error ? error.message : "載入會員清單失敗。"
        );
      })
      .finally(() => {
        if (!active) {
          return;
        }

        setIsLoadingMembers(false);
      });

    return () => {
      active = false;
    };
  }, [isAdmin, member?.id]);

  async function refreshManagedMembers() {
    if (!isAdmin) {
      return;
    }

    setIsLoadingMembers(true);
    setMemberManagementError("");

    try {
      setManagedMembers(await listManagedMembers());
    } catch (error) {
      setMemberManagementError(
        error instanceof Error ? error.message : "載入會員清單失敗。"
      );
    } finally {
      setIsLoadingMembers(false);
    }
  }

  async function handleManagedMemberSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !managedMemberForm.fullName.trim() ||
      !managedMemberForm.email.trim() ||
      !managedMemberForm.phone.trim() ||
      !managedMemberForm.password
    ) {
      setMemberManagementError("請完整填寫要建立的會員資料。");
      return;
    }

    setIsSavingManagedMember(true);
    setMemberManagementError("");
    setMemberManagementNotice("");

    try {
      const result = await createManagedMember(managedMemberForm);
      setManagedMemberForm(INITIAL_MANAGED_MEMBER_FORM);
      setMemberManagementNotice(
        result.created
          ? `已建立會員 ${result.member?.email || ""}。`
          : `已更新會員 ${result.member?.email || ""}。`
      );
      await refreshManagedMembers();
    } catch (error) {
      setMemberManagementError(
        error instanceof Error ? error.message : "建立會員失敗。"
      );
    } finally {
      setIsSavingManagedMember(false);
    }
  }

  if (!member) {
    return (
      <section className="contentStack">
        <header className="pageIntro">
          <div>
            <p className="microLabel">{page.eyebrow}</p>
            <h2>{page.title}</h2>
            <p>{page.description}</p>
          </div>
        </header>

        <div className="emptyRouteState">
          <p className="microLabel">{page.eyebrow}</p>
          <h3>{page.guestTitle}</h3>
          <p>{page.guestBody}</p>
          <div className="requestFormPanel__actions">
            <button onClick={() => onNavigate("/login")} type="button">
              {page.loginLabel}
            </button>
            <button
              className="detailHero__ghostButton"
              onClick={() => onNavigate("/register")}
              type="button"
            >
              {page.registerLabel}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="contentStack">
      <header className="pageIntro">
        <div>
          <p className="microLabel">{page.eyebrow}</p>
          <h2>{page.title}</h2>
          <p>{page.description}</p>
        </div>
      </header>

      <section className="commerceLayout">
        <div className="commercePanel">
          <article className="profileCard">
            <div className="profileCard__header">
              <div>
                <p className="microLabel">{page.profileTitle}</p>
                <h3>{member.fullName}</h3>
              </div>
              <button
                className="detailHero__ghostButton"
                onClick={async () => {
                  await logoutMember();
                  onNavigate("/");
                }}
                type="button"
              >
                {page.signOutLabel}
              </button>
            </div>

            <div className="profileCard__grid">
              <div>
                <span>電子郵件</span>
                <strong>{member.email}</strong>
              </div>
              <div>
                <span>聯絡電話</span>
                <strong>{member.phone}</strong>
              </div>
              <div>
                <span>{page.memberSinceLabel}</span>
                <strong>{formatDate(member.joinedAt)}</strong>
              </div>
            </div>

            <div className="profileCard__address">
              <p className="microLabel">{page.defaultAddressTitle}</p>
              {member.defaultAddress ? (
                <p>
                  {[
                    member.defaultAddress.recipient,
                    member.defaultAddress.postalCode,
                    member.defaultAddress.city,
                    member.defaultAddress.district,
                    member.defaultAddress.addressLine1,
                    member.defaultAddress.addressLine2
                  ]
                    .filter(Boolean)
                    .join(" ")}
                </p>
              ) : (
                <p>尚未儲存預設收件資訊，可在結帳時勾選儲存。</p>
              )}
            </div>
          </article>

          <article className="orderHistoryPanel">
            <div className="profileCard__header">
              <div>
                <p className="microLabel">{page.orderHistoryTitle}</p>
                <h3>{page.orderHistoryTitle}</h3>
              </div>
            </div>

            {orders.length ? (
              <div className="orderHistoryList">
                {orders.map((order) => (
                  <article className="orderHistoryItem" key={order.reference}>
                    <div>
                      <p className="microLabel">{order.reference}</p>
                      <h4>{formatDate(order.createdAt)}</h4>
                      <span>{order.itemCount} 件商品</span>
                    </div>
                    <div className="orderHistoryItem__meta">
                      <strong>{formatCurrency(order.totalAmount)}</strong>
                      <button
                        className="detailHero__ghostButton"
                        onClick={() =>
                          onNavigate(
                            `/order-complete?reference=${encodeURIComponent(order.reference)}`
                          )
                        }
                        type="button"
                      >
                        查看
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="emptyRouteState emptyRouteState_inline">
                <p>{page.emptyOrdersLabel}</p>
              </div>
            )}
          </article>

          {isAdmin ? (
            <article className="memberManagementPanel">
              <div className="profileCard__header">
                <div>
                  <p className="microLabel">Member Admin</p>
                  <h3>會員管理</h3>
                </div>
                <button
                  className="detailHero__ghostButton"
                  disabled={isLoadingMembers}
                  onClick={() => {
                    void refreshManagedMembers();
                  }}
                  type="button"
                >
                  {isLoadingMembers ? "整理中..." : "重新整理會員"}
                </button>
              </div>

              <p className="memberManagementPanel__caption">
                目前登入帳號具管理權限。你可以查看已註冊會員，或建立新的會員帳號。
              </p>

              <form className="requestFormPanel memberManagementForm" onSubmit={handleManagedMemberSubmit}>
                <div className="checkoutPanel__grid">
                  <label>
                    <span>姓名</span>
                    <input
                      onChange={(event) =>
                        setManagedMemberForm((current) => ({
                          ...current,
                          fullName: event.target.value
                        }))
                      }
                      type="text"
                      value={managedMemberForm.fullName}
                    />
                  </label>
                  <label>
                    <span>電子郵件</span>
                    <input
                      onChange={(event) =>
                        setManagedMemberForm((current) => ({
                          ...current,
                          email: event.target.value
                        }))
                      }
                      type="email"
                      value={managedMemberForm.email}
                    />
                  </label>
                  <label>
                    <span>聯絡電話</span>
                    <input
                      onChange={(event) =>
                        setManagedMemberForm((current) => ({
                          ...current,
                          phone: event.target.value
                        }))
                      }
                      type="tel"
                      value={managedMemberForm.phone}
                    />
                  </label>
                  <label>
                    <span>登入密碼</span>
                    <input
                      onChange={(event) =>
                        setManagedMemberForm((current) => ({
                          ...current,
                          password: event.target.value
                        }))
                      }
                      type="password"
                      value={managedMemberForm.password}
                    />
                  </label>
                </div>

                {memberManagementError ? (
                  <div className="formNotice formNotice_error">{memberManagementError}</div>
                ) : null}

                {memberManagementNotice ? (
                  <div className="formNotice formNotice_success">{memberManagementNotice}</div>
                ) : null}

                <div className="requestFormPanel__actions">
                  <button disabled={isSavingManagedMember} type="submit">
                    {isSavingManagedMember ? "建立中..." : "建立 / 更新會員"}
                  </button>
                </div>
              </form>

              <div className="memberDirectory">
                {managedMembers.length ? (
                  managedMembers.map((managedMember) => (
                    <article className="memberDirectoryItem" key={managedMember.id}>
                      <div>
                        <div className="memberDirectoryItem__titleRow">
                          <p className="microLabel">
                            {managedMember.isAdmin ? "Admin" : "Member"}
                          </p>
                          {managedMember.email === member.email ? (
                            <span className="memberBadge">目前帳號</span>
                          ) : null}
                        </div>
                        <h4>{managedMember.fullName}</h4>
                        <span>{managedMember.email}</span>
                      </div>
                      <div className="memberDirectoryItem__meta">
                        <strong>{managedMember.phone}</strong>
                        <span>{formatDate(managedMember.joinedAt)}</span>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="emptyRouteState emptyRouteState_inline">
                    <p>{isLoadingMembers ? "正在載入會員..." : "目前還沒有會員資料。"}</p>
                  </div>
                )}
              </div>
            </article>
          ) : null}
        </div>

        <aside className="summaryPanel">
          <p className="microLabel">Actions</p>
          <h3>快速操作</h3>
          <div className="summaryPanel__row">
            <span>購物車件數</span>
            <strong>{cartItemCount}</strong>
          </div>
          {isAdmin ? (
            <div className="summaryPanel__row">
              <span>管理權限</span>
              <strong>會員管理</strong>
            </div>
          ) : null}
          <button
            className="summaryPanel__primary"
            onClick={() => onNavigate(cartItemCount > 0 ? "/checkout" : "/products")}
            type="button"
          >
            {cartItemCount > 0 ? page.checkoutLabel : page.continueShoppingLabel}
          </button>
          <button
            className="detailHero__ghostButton summaryPanel__secondary"
            onClick={() => onNavigate("/products")}
            type="button"
          >
            {page.continueShoppingLabel}
          </button>
        </aside>
      </section>
    </section>
  );
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("zh-TW", {
      dateStyle: "medium"
    }).format(new Date(value));
  } catch {
    return value;
  }
}
