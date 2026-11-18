import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { orcamentosApi } from "../../lib/orcamentos/api";
import { appRoot, btnPrimary, inputClass, labelClass } from "./panelStyles";

type Props = {
  onSuccess: (username: string) => void;
};

function TrafficLights() {
  return (
    <span className="inline-flex items-center gap-1.5" aria-hidden>
      <span className="size-2.5 rounded-full bg-red-500 sm:size-3" />
      <span className="size-2.5 rounded-full bg-yellow-500 sm:size-3" />
      <span className="size-2.5 rounded-full bg-green-500 sm:size-3" />
    </span>
  );
}

function Login({ onSuccess }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");

  useEffect(() => {
    document.title = "Orçamentos · .dev Bossle";
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await orcamentosApi.login(username, password);
      onSuccess(user.username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login");
    } finally {
      setLoading(false);
    }
  };

  const requestReset = async () => {
    setError("");
    setForgotMsg("");
    setLoading(true);
    try {
      const res = await orcamentosApi.forgotPassword();
      setForgotSent(true);
      setForgotMsg(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao solicitar reset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${appRoot} flex flex-col`}>
      <header className="px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link to="/" className="flex cursor-pointer items-center gap-2 sm:gap-2.5">
            <TrafficLights />
            <span className="ml-1 font-bold sm:ml-2">.dev Bossle</span>
          </Link>
          <span className={labelClass}>
            Orçamentos
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {mode === "forgot" ? (
          <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-7 shadow-float sm:p-9">
            <p className="text-sm font-medium text-accent-text">
              Segurança
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Redefinir senha
            </h1>
            <p className="mt-2 text-sm text-muted">
              Enviaremos um link para o e-mail cadastrado em{" "}
              <strong className="font-medium text-muted">
                Meus dados
              </strong>
              .
            </p>

            {forgotSent ? (
              <p
                className="mt-6 text-sm text-accent-text"
                role="status"
              >
                {forgotMsg ||
                  "Se houver e-mail em Meus dados, o link foi enviado."}
              </p>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={requestReset}
                className={`${btnPrimary} mt-8 min-h-11 w-full`}
              >
                {loading ? "Enviando…" : "Enviar link por e-mail"}
              </button>
            )}

            {error ? (
              <p
                className="mt-4 text-sm text-danger"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <button
              type="button"
              className="mt-6 text-sm font-medium text-accent-text underline decoration-accent/30 underline-offset-4"
              onClick={() => {
                setMode("login");
                setError("");
                setForgotSent(false);
                setForgotMsg("");
              }}
            >
              Voltar ao login
            </button>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="w-full max-w-md rounded-2xl border border-line bg-surface p-7 shadow-float sm:p-9"
          >
            <p className="text-sm font-medium text-accent-text">
              Área privada
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Entrar no painel
            </h1>
            <p className="mt-2 text-sm text-muted">
              orcamentos.devbossle.com.br
            </p>

            <label className="mt-8 block">
              <span className={labelClass}>
                Usuário
              </span>
              <input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`${inputClass} mt-2`}
                required
              />
            </label>

            <label className="mt-4 block">
              <span className={labelClass}>
                Senha
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} mt-2`}
                required
              />
            </label>

            {error ? (
              <p
                className="mt-4 text-sm text-danger"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className={`${btnPrimary} mt-6 min-h-11 w-full`}
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>

            <button
              type="button"
              className="mt-4 w-full text-center text-sm font-medium text-accent-text underline decoration-accent/30 underline-offset-4"
              onClick={() => {
                setMode("forgot");
                setError("");
              }}
            >
              Esqueci a senha
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

export default Login;
