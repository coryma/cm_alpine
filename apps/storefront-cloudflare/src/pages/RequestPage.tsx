import { startTransition, useState } from "react";
import type { RequestPageContent, RequestPayload } from "../../shared/contracts";
import { submitRequest } from "../lib/api";

interface RequestPageProps {
  onNavigate: (href: string) => void;
  page: RequestPageContent;
}

export function RequestPage({ onNavigate, page }: RequestPageProps) {
  const [form, setForm] = useState<RequestPayload>(() => buildInitialForm(page.defaultInterest));
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.fullName.trim() || !form.email.trim()) {
      setErrorMessage(page.validationMessage);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const result = await submitRequest(form);

      startTransition(() => {
        setSuccessMessage(result.message);
        setReference(result.reference);
        setForm(buildInitialForm(page.defaultInterest));
      });
    } catch (error) {
      startTransition(() => {
        setErrorMessage(
          error instanceof Error ? error.message : page.submitErrorMessage
        );
      });
    } finally {
      setIsSubmitting(false);
    }
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

      <section className="requestLayout">
        <article className="requestLeadPanel">
          <p className="microLabel">{page.panelEyebrow}</p>
          <h3>{page.panelTitle}</h3>
          <p>{page.panelBody}</p>
          <ul className="detailHighlightList">
            {page.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <form className="requestFormPanel" onSubmit={handleSubmit}>
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
            <span>{page.fieldLabels.company}</span>
            <input
              onChange={(event) =>
                setForm((current) => ({ ...current, company: event.target.value }))
              }
              type="text"
              value={form.company}
            />
          </label>
          <label>
            <span>{page.fieldLabels.interest}</span>
            <input
              onChange={(event) =>
                setForm((current) => ({ ...current, interest: event.target.value }))
              }
              type="text"
              value={form.interest}
            />
          </label>
          <label>
            <span>{page.fieldLabels.message}</span>
            <textarea
              onChange={(event) =>
                setForm((current) => ({ ...current, message: event.target.value }))
              }
              rows={5}
              value={form.message}
            />
          </label>

          {errorMessage ? <div className="formNotice formNotice_error">{errorMessage}</div> : null}
          {successMessage ? (
            <div className="formNotice formNotice_success">
              <strong>{successMessage}</strong>
              <span>{reference}</span>
            </div>
          ) : null}

          <div className="requestFormPanel__actions">
            <button disabled={isSubmitting} type="submit">
              {isSubmitting ? page.submitBusyLabel : page.submitIdleLabel}
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

function buildInitialForm(defaultInterest: string): RequestPayload {
  const initialForm: RequestPayload = {
    fullName: "",
    email: "",
    company: "",
    interest: defaultInterest,
    message: ""
  };

  if (typeof window === "undefined") {
    return initialForm;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const interest = searchParams.get("interest")?.trim();
  const message = searchParams.get("message")?.trim();

  return {
    ...initialForm,
    interest: interest || initialForm.interest,
    message: message || initialForm.message
  };
}
