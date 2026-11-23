import type { VercelRequest, VercelResponse } from "@vercel/node";
import { issueSignedToken } from "@vercel/blob";
import { handleUpload, handleUploadPresigned, type HandleUploadBody, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { json, readBody, requireSession } from "../../_lib/auth.js";

const ALLOWED_TYPES = ["image/jpeg", "video/mp4", "video/quicktime"];
const MAX_BYTES = 300 * 1024 * 1024;

/**
 * Como o painel fala com o Vercel Blob:
 * - "token": store antigo, com BLOB_READ_WRITE_TOKEN (client token assinado pelo token).
 * - "presigned": store novo, conectado por OIDC (só BLOB_STORE_ID + BLOB_WEBHOOK_PUBLIC_KEY);
 *   a function pede um token curto à Vercel e devolve uma URL pré-assinada de upload.
 */
export function blobUploadMode(): "token" | "presigned" | null {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "token";
  if (process.env.BLOB_STORE_ID) return "presigned";
  return null;
}

/**
 * Upload direto do navegador para o Vercel Blob (o arquivo não passa pela function).
 * O Instagram baixa a mídia por URL pública, então o store precisa ser público.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!(await requireSession(req, res))) return;
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  const mode = blobUploadMode();
  if (!mode) return json(res, 400, { error: "Conecte um Blob store público ao projeto na Vercel" });

  const body = readBody(req);
  if (!body) return json(res, 400, { error: "JSON inválido" });

  const checkPath = (pathname: string) => {
    if (!pathname.startsWith("instagram/")) throw new Error("Caminho inválido");
  };

  try {
    if (mode === "token") {
      const result = await handleUpload({
        body: body as unknown as HandleUploadBody,
        request: req,
        onBeforeGenerateToken: async (pathname) => {
          checkPath(pathname);
          return { allowedContentTypes: ALLOWED_TYPES, maximumSizeInBytes: MAX_BYTES, addRandomSuffix: true };
        },
      });
      return json(res, 200, result);
    }

    const result = await handleUploadPresigned({
      body: body as unknown as HandleUploadPresignedBody,
      request: req,
      getSignedToken: async (pathname) => {
        checkPath(pathname);
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          validUntil: Date.now() + 15 * 60_000,
        });
        return {
          token,
          urlOptions: { allowedContentTypes: ALLOWED_TYPES, maximumSizeInBytes: MAX_BYTES, addRandomSuffix: true },
        };
      },
    });
    return json(res, 200, result);
  } catch (error) {
    console.error("instagram upload:", error);
    return json(res, 400, { error: error instanceof Error ? error.message : "Falha no upload" });
  }
}
