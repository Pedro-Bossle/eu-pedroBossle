import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { orcamentosApi } from "../../lib/orcamentos/api";

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
    <div className="flex min-h-dvh flex-col bg-[#f9f9f9] text-neutral-900 dark:bg-[#121212] dark:text-[#f9f9f9] [&_a]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:not(:disabled)]:cursor-pointer [&_label]:cursor-pointer [&_select]:cursor-pointer [&_input[type=checkbox]]:cursor-pointer [&_input[type=radio]]:cursor-pointer">
      <header className="border-b border-neutral-200 bg-[#F3F4F6] px-4 py-4 dark:border-neutral-800 dark:bg-[#151515] sm:px-6">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link to="/" className="flex cursor-pointer items-center gap-2 sm:gap-2.5">
            <TrafficLights />
            <span className="ml-1 font-bold sm:ml-2">.dev Bossle</span>
          </Link>
          <span className="text-xs font-medium uppercase tracking-[0.14em] opacity-50">
            Orçamentos
          </span>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {mode === "forgot" ? (
          <div className="w-full max-w-md border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-[#151515] sm:p-10">
            <p className="text-sm font-medium uppercase tracking-widest opacity-60">
              Segurança
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Redefinir senha
            </h1>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              Enviaremos um link para o e-mail cadastrado em{" "}
              <strong className="font-medium text-neutral-700 dark:text-neutral-300">
                Meus dados
              </strong>
              .
            </p>

            {forgotSent ? (
              <p
                className="mt-6 text-sm text-emerald-800 dark:text-emerald-300"
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
                className="mt-8 w-full cursor-pointer bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#f9f9f9] dark:text-neutral-900"
              >
                {loading ? "Enviando…" : "Enviar link por e-mail"}
              </button>
            )}

            {error ? (
              <p
                className="mt-4 text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <button
              type="button"
              className="mt-6 text-sm font-medium text-emerald-800 underline decoration-emerald-800/30 underline-offset-4 dark:text-emerald-300"
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
            className="w-full max-w-md border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-[#151515] sm:p-10"
          >
            <p className="text-sm font-medium uppercase tracking-widest opacity-60">
              Área privada
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Entrar no painel
            </h1>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              orcamentos.devbossle.com.br
            </p>

            <label className="mt-8 block">
              <span className="text-xs font-medium uppercase tracking-[0.14em] opacity-50">
                Usuário
              </span>
              <input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2 w-full border border-neutral-200 bg-[#f9f9f9] px-3 py-3 text-sm outline-none transition focus:border-emerald-600 dark:border-neutral-700 dark:bg-[#121212] dark:focus:border-emerald-400"
                required
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-medium uppercase tracking-[0.14em] opacity-50">
                Senha
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full border border-neutral-200 bg-[#f9f9f9] px-3 py-3 text-sm outline-none transition focus:border-emerald-600 dark:border-neutral-700 dark:bg-[#121212] dark:focus:border-emerald-400"
                required
              />
            </label>

            {error ? (
              <p
                className="mt-4 text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full cursor-pointer bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#f9f9f9] dark:text-neutral-900"
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>

            <button
              type="button"
              className="mt-4 w-full text-center text-sm font-medium text-emerald-800 underline decoration-emerald-800/30 underline-offset-4 dark:text-emerald-300"
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
