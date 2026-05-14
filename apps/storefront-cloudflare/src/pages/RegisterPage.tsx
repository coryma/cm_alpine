import { startTransition, useState } from "react";
import type { RegisterPageContent } from "../../shared/contracts";
import type { MemberProfile } from "../lib/memberStore";
import { registerMember } from "../lib/memberStore";

interface RegisterPageProps {
  currentMember: MemberProfile | null;
  onNavigate: (href: string) => void;
  page: RegisterPageContent;
  redirectTo: string;
}

interface RegisterFormState {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export function RegisterPage({
  currentMember,
  onNavigate,
  page,
  redirectTo
}: RegisterPageProps) {
  const [form, setForm] = useState<RegisterFormState>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (currentMember) {
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
          <p className="microLabel">Member</p>
          <h3>你已經登入會員。</h3>
          <p>可以直接前往會員中心或繼續結帳。</p>
          <div className="requestFormPanel__actions">
            <button onClick={() => onNavigate("/account")} type="button">
              前往會員中心
            </button>
            <button
              className="detailHero__ghostButton"
              onClick={() => onNavigate(redirectTo || "/products")}
              type="button"
            >
              繼續前往
            </button>
          </div>
        </div>
      </section>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !form.fullName.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.password ||
      form.password !== form.confirmPassword
    ) {
      setErrorMessage(page.validationMessage);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await registerMember({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        password: form.password
      });

      startTransition(() => {
        onNavigate(redirectTo || "/account");
      });
    } catch (error) {
      startTransition(() => {
        const nextMessage =
          error instanceof Error ? error.message : page.duplicateEmailMessage;
        setErrorMessage(nextMessage);
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const loginPath = redirectTo
    ? `/login?redirect=${encodeURIComponent(redirectTo)}`
    : "/login";

  return (
    <section className="contentStack">
      <header className="pageIntro">
        <div>
          <p className="microLabel">{page.eyebrow}</p>
          <h2>{page.title}</h2>
          <p>{page.description}</p>
        </div>
      </header>

      <section className="authLayout">
        <article className="requestLeadPanel authLeadPanel">
          <p className="microLabel">{page.eyebrow}</p>
          <h3>{page.title}</h3>
          <p>{page.description}</p>
          <ul className="detailHighlightList">
            <li>保留常用聯絡與收件資訊</li>
            <li>在本機查看你建立過的訂單</li>
            <li>之後可再接真正的會員與金流後端</li>
          </ul>
        </article>

        <form className="requestFormPanel authPanel" onSubmit={handleSubmit}>
          <label>
            <span>{page.fieldLabels.fullName}</span>
            <input
              onChange={(event) =>
                setForm((current) => ({ ...current, fullName: event.target.value }))
              }
              type="text"
              value={form.fullName}
            />
          </label>
          <label>
            <span>{page.fieldLabels.email}</span>
            <input
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              type="email"
              value={form.email}
            />
          </label>
          <label>
            <span>{page.fieldLabels.phone}</span>
            <input
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
              type="tel"
              value={form.phone}
            />
          </label>
          <label>
            <span>{page.fieldLabels.password}</span>
            <input
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              type="password"
              value={form.password}
            />
          </label>
          <label>
            <span>{page.fieldLabels.confirmPassword}</span>
            <input
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value
                }))
              }
              type="password"
              value={form.confirmPassword}
            />
          </label>

          {errorMessage ? <div className="formNotice formNotice_error">{errorMessage}</div> : null}

          <div className="requestFormPanel__actions">
            <button disabled={isSubmitting} type="submit">
              {isSubmitting ? page.submitBusyLabel : page.submitIdleLabel}
            </button>
            <button
              className="detailHero__ghostButton"
              onClick={() => onNavigate(loginPath)}
              type="button"
            >
              {page.loginLabel}
            </button>
            <button
              className="detailHero__ghostButton"
              onClick={() => onNavigate("/products")}
              type="button"
            >
              {page.browseProductsLabel}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}
