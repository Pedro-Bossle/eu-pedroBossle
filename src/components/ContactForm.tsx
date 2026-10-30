import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { MODELS } from "../data/models";
import { useLanguage } from "../i18n/LanguageContext";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const fieldClass =
  "mt-1.5 w-full border border-neutral-300 bg-white px-3.5 py-3 text-base outline-none transition focus:border-neutral-900 dark:border-neutral-700 dark:bg-[#151515] dark:focus:border-neutral-200 sm:px-3 sm:py-2.5 sm:text-sm";

type Props = {
  /** Id do modelo escolhido ("" = nenhum). */
  model: string;
  onModelChange: (id: string) => void;
  idPrefix: string;
};

function ContactForm({ model, onModelChange, idPrefix }: Props) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [idea, setIdea] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanIdea = idea.trim();

    if (cleanName.length < 2 || !isEmail(cleanEmail) || cleanIdea.length < 8) {
      setStatus("error");
      setErrorMsg(t.form.error);
      return;
    }
    if (!consent) {
      setStatus("error");
      setErrorMsg(t.form.consentError);
      return;
    }

    const picked = MODELS.find((m) => m.id === model);
    const pickedName = picked ? t.models.items[picked.id].name : "";

    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/orcamentos/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          idea: pickedName ? `${t.form.modelPrefix}: ${pickedName}\n\n${cleanIdea}` : cleanIdea,
          style: pickedName,
          styleId: picked ? `modelo:${picked.id}` : "",
          website: honeypot,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(
          typeof data.error === "string"
            ? data.error
            : res.status === 429
              ? t.form.rateLimit
              : t.form.error,
        );
        return;
      }
      setStatus("success");
      setName("");
      setEmail("");
      setIdea("");
      setConsent(false);
    } catch {
      setStatus("error");
      setErrorMsg(t.form.error);
    }
  };

  return (
    <form onSubmit={submit} className="relative flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-medium" htmlFor={`${idPrefix}-name`}>
          {t.form.name}
          <input
            id={`${idPrefix}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            autoComplete="name"
            className={fieldClass}
          />
        </label>
        <label className="block text-xs font-medium" htmlFor={`${idPrefix}-email`}>
          {t.form.email}
          <input
            id={`${idPrefix}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={200}
            autoComplete="email"
            inputMode="email"
            className={fieldClass}
          />
        </label>
      </div>

      <label className="block text-xs font-medium" htmlFor={`${idPrefix}-model`}>
        {t.form.model}
        <select
          id={`${idPrefix}-model`}
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          className={fieldClass}
        >
          <option value="">{t.form.modelNone}</option>
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {t.models.items[m.id].name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs font-medium" htmlFor={`${idPrefix}-idea`}>
        {t.form.idea}
        <textarea
          id={`${idPrefix}-idea`}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          required
          maxLength={3800}
          rows={5}
          placeholder={t.form.ideaPlaceholder}
          className={`${fieldClass} min-h-32 resize-y`}
        />
      </label>

      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        aria-hidden
      />

      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-neutral-900 dark:accent-neutral-200"
        />
        <span>
          {t.form.consentPre}{" "}
          <Link
            to="/politica-de-privacidade"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {t.form.consentLink}
          </Link>{" "}
          {t.form.consentPost}
        </span>
      </label>

      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex w-full items-center justify-center border border-neutral-900 bg-neutral-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 dark:border-[#f9f9f9] dark:bg-[#f9f9f9] dark:text-neutral-900 sm:w-auto sm:self-start sm:py-3"
      >
        {status === "loading" ? t.form.submitting : t.form.submit}
      </button>

      {status === "success" ? (
        <p role="status" className="text-sm font-medium">
          {t.form.success}
        </p>
      ) : null}
      {status === "error" ? (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {errorMsg}
        </p>
      ) : null}
    </form>
  );
}

export default ContactForm;
