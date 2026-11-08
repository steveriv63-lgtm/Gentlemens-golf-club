
const { Client } = require("pg");

exports.handler = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000
  });

  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL non configurata");
    }

    await client.connect();
    await client.query("SELECT 1");

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        stato: "ok",
        messaggio: "Connessione al database riuscita"
      })
    };
  } catch (error) {
    console.error("Errore connessione database:", error.message);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        stato: "errore",
        messaggio: "Connessione al database non riuscita"
      })
    };
  } finally {
    await client.end().catch(() => {});
  }
};
