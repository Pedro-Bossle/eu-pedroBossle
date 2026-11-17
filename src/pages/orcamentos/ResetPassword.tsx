import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { orcamentosApi } from "../../lib/orcamentos/api";
import { appRoot, btnPrimary, inputClass, labelClass } from "./panelStyles";

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
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-7 shadow-float sm:p-9">
          <p className="text-sm font-medium text-accent-text">
            Segurança
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Nova senha
          </h1>

          {done ? (
            <>
              <p className="mt-4 text-sm text-muted">
                Senha atualizada. Você já pode entrar no painel.
              </p>
              <button
                type="button"
                className={`${btnPrimary} mt-6 min-h-11 w-full`}
                onClick={onDone}
              >
                Ir para o login
              </button>
            </>
          ) : (
            <form onSubmit={submit} className="mt-2">
              <p className="text-sm text-muted">
                Defina uma senha com no mínimo 8 caracteres.
              </p>

              <label className="mt-8 block">
                <span className={labelClass}>
                  Nova senha
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} mt-2`}
                  required
                  minLength={8}
                />
              </label>

              <label className="mt-4 block">
                <span className={labelClass}>
                  Confirmar senha
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`${inputClass} mt-2`}
                  required
                  minLength={8}
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
