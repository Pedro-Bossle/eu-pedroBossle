import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL");
  process.exit(1);
}

function splitSql(raw) {
  const withoutLineComments = raw.replace(/^\s*--.*$/gm, "");
  const statements = [];
  let current = "";
  let inDollar = false;
  let dollarTag = "";

  for (let i = 0; i < withoutLineComments.length; i += 1) {
    const ch = withoutLineComments[i];

    if (!inDollar && ch === "$") {
      const rest = withoutLineComments.slice(i);
      const match = rest.match(/^\$([A-Za-z_]*)\$/);
      if (match) {
        inDollar = true;
        dollarTag = match[0];
        current += dollarTag;
        i += dollarTag.length - 1;
        continue;
      }
    }

    if (inDollar && withoutLineComments.startsWith(dollarTag, i)) {
      current += dollarTag;
      i += dollarTag.length - 1;
      inDollar = false;
      dollarTag = "";
      continue;
    }

    if (!inDollar && ch === ";") {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
      continue;
    }

    current += ch;
  }

  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

const sqlFiles = [
  resolve("db/001_orcamentos_schema.sql"),
  resolve("db/002_proposal_share.sql"),
  resolve("db/003_text_presets.sql"),
  resolve("db/004_client_contract_fields.sql"),
  resolve("db/005_password_reset.sql"),
];
const pool = new Pool({ connectionString: url });
const client = await pool.connect();

try {
  for (const sqlFile of sqlFiles) {
    console.log("Arquivo:", sqlFile);
    const statements = splitSql(readFileSync(sqlFile, "utf8"));
    for (const statement of statements) {
      await client.query(statement);
      console.log("OK:", statement.slice(0, 72).replace(/\s+/g, " "), "…");
    }
  }
  console.log("Migration concluída.");
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
