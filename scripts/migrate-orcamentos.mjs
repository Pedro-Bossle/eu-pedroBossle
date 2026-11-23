import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  // No build da Vercel sem banco (ex.: fork), segue sem migrar.
  if (process.argv.includes("--optional")) {
    console.log("DATABASE_URL ausente: migrations puladas.");
    process.exit(0);
  }
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
  resolve("db/006_session_version.sql"),
  resolve("db/007_contact_leads.sql"),
  resolve("db/008_prospects.sql"),
  resolve("db/009_prospect_funnel.sql"),
  resolve("db/010_prospect_scoring.sql"),
  resolve("db/011_instagram.sql"),
  resolve("db/012_finance.sql"),
  resolve("db/013_crm.sql"),
  resolve("db/014_crm_automations.sql"),
  resolve("db/015_crm_recurring.sql"),
  resolve("db/016_crm_payments.sql"),
  resolve("db/017_crm_projects.sql"),
  resolve("db/018_perf_indexes.sql"),
  resolve("db/019_prospect_rules.sql"),
  resolve("db/020_meta_webhooks.sql"),
  resolve("db/021_bot_scopes.sql"),
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
