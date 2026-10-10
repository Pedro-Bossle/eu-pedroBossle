import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { orcamentosApi } from "../../lib/orcamentos/api";

type Props = {
  token: string;
  onDone: () => void;
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

function ResetPassword({ token, onDone }: Props) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = "Redefinir senha · Orçamentos";
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem");
      return;
    }
    setLoading(true);
    try {
      await orcamentosApi.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao redefinir");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#f9f9f9] text-neutral-900 dark:bg-[#121212] dark:text-[#f9f9f9] [&_a]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:not(:disabled)]:cursor-pointer [&_label]:cursor-pointer">
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
        <div className="w-full max-w-md border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-[#151515] sm:p-10">
          <p className="text-sm font-medium uppercase tracking-widest opacity-60">
            Segurança
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Nova senha
          </h1>

          {done ? (
            <>
              <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
                Senha atualizada. Você já pode entrar no painel.
              </p>
              <button
                type="button"
                className="mt-6 w-full cursor-pointer bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 dark:bg-[#f9f9f9] dark:text-neutral-900"
                onClick={onDone}
              >
                Ir para o login
              </button>
            </>
          ) : (
            <form onSubmit={submit} className="mt-2">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Defina uma senha com no mínimo 8 caracteres.
              </p>

              <label className="mt-8 block">
                <span className="text-xs font-medium uppercase tracking-[0.14em] opacity-50">
                  Nova senha
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full border border-neutral-200 bg-[#f9f9f9] px-3 py-3 text-sm outline-none transition focus:border-emerald-600 dark:border-neutral-700 dark:bg-[#121212] dark:focus:border-emerald-400"
                  required
                  minLength={8}
                />
              </label>

              <label className="mt-4 block">
                <span className="text-xs font-medium uppercase tracking-[0.14em] opacity-50">
                  Confirmar senha
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-2 w-full border border-neutral-200 bg-[#f9f9f9] px-3 py-3 text-sm outline-none transition focus:border-emerald-600 dark:border-neutral-700 dark:bg-[#121212] dark:focus:border-emerald-400"
                  required
                  minLength={8}
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
                {loading ? "Salvando…" : "Salvar nova senha"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default ResetPassword;
