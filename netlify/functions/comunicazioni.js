
exports.handler = async () => {
  return {
    statusCode: 503,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify({
      stato: "in_preparazione",
      messaggio: "Servizio comunicazioni in preparazione"
    })
  };
};
