import { Link } from "react-router";
import { useLanguage } from "../i18n/LanguageContext";

function Contact() {
  const { t } = useLanguage();

  return (
    <section
      id="contato"
      className="
        mx-auto w-full max-w-5xl
        scroll-mt-(--header-h)
        px-4 py-16
        sm:px-6 sm:py-20
        md:px-8
      "
    >
      <p className="text-sm font-medium uppercase tracking-widest opacity-60">
        {t.contact.eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        {t.contact.title}
      </h2>
      <ul>
        <li>
          <a
            href="https://www.linkedin.com/in/pedro-bossle-sandi-685625277/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
        </li>
      </ul>
      <ul>
        <li>
          <a
            href="https://www.instagram.com/pedro_bossle/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram
          </a>
        </li>
      </ul>
      <ul>
        <li>
          <a
            href="mailto:pedro.bossle.s@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Email
          </a>
        </li>
      </ul>
      <ul>
        <li>
          <Link to="/curriculo-virtual">{t.contact.resumeLink}</Link>
        </li>
      </ul>
    </section>
  );
}

export default Contact;
