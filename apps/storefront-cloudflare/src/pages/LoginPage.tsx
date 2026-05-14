import { startTransition, useState } from "react";
import type { LoginPageContent } from "../../shared/contracts";
import type { MemberProfile } from "../lib/memberStore";
import { loginMember } from "../lib/memberStore";

interface LoginPageProps {
  currentMember: MemberProfile | null;
  onNavigate: (href: string) => void;
  page: LoginPageContent;
  redirectTo: string;
}

interface LoginFormState {
  email: string;
  password: string;
}

export function LoginPage({
  currentMember,
  onNavigate,
  page,
  redirectTo
}: LoginPageProps) {
  const [form, setForm] = useState<LoginFormState>({
    email: "",
    password: ""
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
          <p>可直接前往會員中心或回到結帳流程。</p>
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

    if (!form.email.trim() || !form.password) {
      setErrorMessage(page.validationMessage);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await loginMember(form);
      startTransition(() => {
        onNavigate(redirectTo || "/account");
      });
    } catch (error) {
      startTransition(() => {
        setErrorMessage(error instanceof Error ? error.message : page.validationMessage);
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const registerPath = redirectTo
    ? `/register?redirect=${encodeURIComponent(redirectTo)}`
    : "/register";

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
            <li>登入後可直接帶入常用收件資訊</li>
            <li>同一裝置可查看已建立的會員訂單</li>
            <li>這版先用本地會員資料模擬真實流程</li>
          </ul>
        </article>

        <form className="requestFormPanel authPanel" onSubmit={handleSubmit}>
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
            <span>{page.fieldLabels.password}</span>
            <input
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              type="password"
              value={form.password}
            />
          </label>

          {errorMessage ? <div className="formNotice formNotice_error">{errorMessage}</div> : null}

          <div className="requestFormPanel__actions">
            <button disabled={isSubmitting} type="submit">
              {isSubmitting ? page.submitBusyLabel : page.submitIdleLabel}
            </button>
            <button
              className="detailHero__ghostButton"
              onClick={() => onNavigate(registerPath)}
              type="button"
            >
              {page.registerLabel}
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
