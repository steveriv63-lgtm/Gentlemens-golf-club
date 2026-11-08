
const crypto = require("node:crypto");

const COOKIE = "ggc_admin_session";
const DURATION = 12 * 60 * 60;

function page(content) {
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Amministrazione | Gentlemen's Golf Club</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#102c4d;font-family:Georgia,serif;color:#173553;padding:20px}
main{width:min(100%,540px);background:#fffdf8;border-radius:15px;padding:38px;box-shadow:0 15px 50px #061b35}
small{color:#a37f4a;letter-spacing:2px;text-transform:uppercase}
h1{font-size:29px;margin:15px 0}
p{line-height:1.6}
input{display:block;width:100%;padding:14px;margin:20px 0;border:1px solid #ccd3dc;border-radius:7px;font-size:16px}
button{background:#173b65;color:white;border:0;border-radius:7px;padding:14px 24px;cursor:pointer;font-size:15px}
.error{color:#a52828}
</style>
</head>
<body><main>
<small>Gentlemen's Golf Club</small>
${content}
</main></body></html>`;
}

function response(statusCode, content, cookie) {
  return {
    statusCode,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      ...(cookie ? { "Set-Cookie": cookie } : {})
    },
    body: page(content)
  };
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret)
    .update("admin:" + value).digest("hex");
}

function validSession(event, secret) {
  const cookies = event.headers.cookie || "";
  const found = cookies.split(";").map(x => x.trim())
    .find(x => x.startsWith(COOKIE + "="));
  if (!found) return false;

  const token = found.slice(COOKIE.length + 1);
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [expiry, signature] = parts;
  if (!/^\d+$/.test(expiry) || Number(expiry) <= Date.now()) return false;

  const expected = sign(expiry, secret);
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;

  return crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expected, "hex")
  );
}

function verifyPassword(password, stored) {
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") return false;

  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000) return false;

  const salt = Buffer.from(parts[2], "base64");
  const expected = Buffer.from(parts[3], "base64");
  if (salt.length !== 16 || expected.length !== 32) return false;

  const actual = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
  return crypto.timingSafeEqual(actual, expected);
}

exports.handler = async event => {
  const secret = process.env.AREA_SOCI_SESSION_SECRET;
  const hash = process.env.ADMIN_PASSWORD_HASH;

  if (!secret || !hash) {
    return response(503, "<h1>Amministrazione in preparazione</h1><p>Configurazione da completare.</p>");
  }

  const loggedIn = validSession(event, secret);

  if (event.httpMethod === "POST") {
    const origin = event.headers.origin;
    const host = event.headers.host;
    if (!origin || !host || origin !== "https://" + host) {
      return response(403, "<h1>Richiesta non autorizzata</h1>");
    }

    const params = new URLSearchParams(event.body || "");
    const action = params.get("action");

    if (action === "logout") {
      return response(200, "<h1>Accesso terminato</h1><p>Hai effettuato la disconnessione.</p>",
        `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`);
    }

    if (action === "login") {
      const password = params.get("password") || "";
      if (password.length <= 256 && verifyPassword(password, hash)) {
        const expiry = String(Date.now() + DURATION * 1000);
        const token = expiry + "." + sign(expiry, secret);
        return response(200,
          "<h1>Benvenuto, Presidente!</h1><p>Accesso amministratore riuscito.</p><p>Il pannello per pubblicare le comunicazioni sarà il prossimo passo.</p>",
          `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${DURATION}`);
      }
      return response(401,
        `<h1>Accesso amministratore</h1><p class="error">Password non corretta.</p>
        <form method="post"><input type="hidden" name="action" value="login">
        <input type="password" name="password" placeholder="Password amministratore" required>
        <button>Accedi</button></form>`);
    }

    return response(400, "<h1>Richiesta non valida</h1>");
  }

  if (event.httpMethod !== "GET") {
    return response(405, "<h1>Metodo non consentito</h1>");
  }

  if (loggedIn) {
    return response(200,
      `<h1>Benvenuto, Presidente!</h1>
      <p>Questa è la tua area personale di amministrazione.</p>
      <p>Presto potrai gestire le comunicazioni del Club direttamente da qui.</p>
      <form method="post"><input type="hidden" name="action" value="logout">
      <button>Esci</button></form>`);
  }

  return response(200,
    `<h1>Accesso amministratore</h1>
    <p>Area riservata alla gestione del Gentlemen's Golf Club.</p>
    <form method="post">
    <input type="hidden" name="action" value="login">
    <input type="password" name="password" placeholder="Password amministratore" required>
    <button>Accedi</button></form>`);
};
