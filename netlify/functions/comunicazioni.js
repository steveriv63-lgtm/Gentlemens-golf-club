
const { Client } = require("pg");

exports.handler = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000
  });

  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("Connessione al database non configurata");
    }

    await client.connect();

    await client.query(`
      CREATE TABLE IF NOT EXISTS comunicazioni (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        titolo TEXT NOT NULL,
        messaggio TEXT NOT NULL,
        data_pubblicazione TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        pubblicata BOOLEAN NOT NULL DEFAULT TRUE
      )
    `);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        stato: "ok",
        messaggio: "Tabella comunicazioni pronta"
      })
    };
  } catch (error) {
    console.error("Errore inizializzazione:", error.message);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        stato: "errore",
        messaggio: "Impossibile preparare la tabella"
      })
    };
  } finally {
    await client.end().catch(() => {});
  }
};
