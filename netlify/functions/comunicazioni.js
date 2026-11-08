
exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify({
      stato: "ok",
      messaggio: "Servizio comunicazioni Gentlemen's Golf Club pronto"
    })
  };
};
