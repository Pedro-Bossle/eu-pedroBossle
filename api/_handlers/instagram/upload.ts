import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { json, readBody, requireSession } from "../../_lib/auth.js";

/**
 * Upload direto do navegador para o Vercel Blob (o arquivo não passa pela function).
 * O Instagram baixa a mídia por URL pública, então ela precisa ficar pública.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return json(res, 400, { error: "Conecte um Blob store ao projeto na Vercel (BLOB_READ_WRITE_TOKEN)" });
  }
  const body = readBody(req) as HandleUploadBody | null;
  if (!body) return json(res, 400, { error: "JSON inválido" });
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("instagram/")) throw new Error("Caminho inválido");
        return {
          allowedContentTypes: ["image/jpeg", "video/mp4", "video/quicktime"],
          maximumSizeInBytes: 300 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });
    return json(res, 200, result);
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : "Falha no upload" });
  }
}
