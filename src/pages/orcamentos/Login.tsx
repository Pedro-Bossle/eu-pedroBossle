import { useState, type FormEvent } from "react";
import { orcamentosApi } from "../../lib/orcamentos/api";

type Props = {
  onSuccess: (username: string) => void;
};

function Login({ onSuccess }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0c1210] px-4 text-[#f4f6f3]">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-[#1f2d27] bg-[#111a16] p-8 shadow-xl"
      >
        <p className="font-mono text-sm tracking-wide text-[#00d492]">
          {">"} devbossle_
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          Painel de orçamentos
        </h1>
        <p className="mt-2 text-sm text-[#93a39b]">
          Área privada · orcamentos.devbossle.com.br
        </p>

        <label className="mt-8 block text-xs font-semibold uppercase tracking-[0.14em] text-[#93a39b]">
          Usuário
          <input
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-2 w-full rounded-xl border border-[#1f2d27] bg-[#0c1210] px-3 py-3 text-sm text-[#f4f6f3] outline-none focus:border-[#00d492]"
            required
          />
        </label>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.14em] text-[#93a39b]">
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border border-[#1f2d27] bg-[#0c1210] px-3 py-3 text-sm text-[#f4f6f3] outline-none focus:border-[#00d492]"
            required
          />
        </label>

        {error ? (
          <p className="mt-4 text-sm text-[#ff7b7b]" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-[#00d492] px-4 py-3 text-sm font-bold text-[#04120c] transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default Login;
