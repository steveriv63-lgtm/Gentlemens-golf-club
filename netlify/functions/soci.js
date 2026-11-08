const crypto = require('node:crypto');
const DAYS = 30;
const COOKIE = 'ggc_soci_session';
const esc = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const html = (title, body) => `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Gentlemen’s Golf Club</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f6fa;color:#10385e;font-family:Arial,sans-serif}header{background:#fff;padding:18px 5vw;display:flex;justify-content:space-between;align-items:center;gap:15px;flex-wrap:wrap}header a{color:#17487c;text-decoration:none}header strong{font:italic 24px Georgia,serif}main{max-width:840px;margin:40px auto;padding:0 18px}.hero{background:linear-gradient(120deg,#062a53,#13518a);color:white;padding:34px;border-radius:8px}h1{font:italic clamp(30px,6vw,46px) Georgia,serif;margin:0 0 8px}.panel{background:#fff;border:1px solid #dce5ef;border-radius:8px;padding:28px;margin-top:24px;box-shadow:0 6px 25px #0a37630d}label{display:block;font-weight:bold;margin-bottom:10px}input{font-size:18px;width:100%;padding:13px;border:1px solid #a4b8cd;border-radius:4px}button,.btn{background:#0a447e;color:#fff;border:0;border-radius:4px;padding:13px 20px;font-size:16px;cursor:pointer;display:inline-block;margin-top:14px;text-decoration:none}.error{color:#9b2131}p,li{line-height:1.65}footer{text-align:center;padding:40px;color:#526b83}</style></head><body><header><strong>Gentlemen’s Golf Club</strong><a href="/index.html">← Torna alla Home</a></header><main><div class="hero"><h1>Area Riservata ai Soci</h1><p>La nostra Clubhouse privata</p></div>${body}</main><footer>Gentlemen’s Golf Club · Semm Secularum</footer></body></html>`;
const response = (statusCode, body, extra={}) => ({statusCode, headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',...extra},body});
function sign(data,secret){return crypto.createHmac('sha256',secret).update(data).digest('base64url')}
function validSession(cookie,secret){
  const m = (cookie||'').match(/(?:^|;\s*)ggc_soci_session=([^;]+)/);if(!m)return false;
  const [exp,sig]=decodeURIComponent(m[1]).split('.');if(!exp||!sig||!/^[0-9]+$/.test(exp))return false;
  const expected=sign(exp,secret);const a=Buffer.from(sig),b=Buffer.from(expected);
  return a.length===b.length&&crypto.timingSafeEqual(a,b)&&Number(exp)>Date.now()&&Number(exp)<Date.now()+DAYS*86400000+60000;
}
function checkPassword(password,encoded){
  const parts=(encoded||'').split(':');if(parts.length!==3||parts[0]!=='pbkdf2-sha256')return false;
  const salt=Buffer.from(parts[1],'base64');const expected=Buffer.from(parts[2],'base64');
  if(salt.length!==16||expected.length!==32)return false;
  const actual=crypto.pbkdf2Sync(password,salt,210000,32,'sha256');
  return crypto.timingSafeEqual(actual,expected);
}
const login=(error='')=>html('Accesso Soci',`<section class="panel"><h2>Accesso riservato</h2><p>Inserisci la password condivisa del Club.</p>${error?`<p class="error" role="alert">${esc(error)}</p>`:''}<form method="post" action="/area-soci.html"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="200"><button type="submit">Entra nell’Area Soci</button></form><p><small>La sessione dura fino a 30 giorni. Non condividere la password al di fuori dei soci.</small></p></section>`);
const members=()=>html('Area Soci',`<section class="panel"><h2>Benvenuti, Gentlemen!</h2><p>Questa è l'area privata del Club. L'accesso è protetto da password.</p><h3>Documenti ufficiali</h3><p>Statuto, verbali e altri documenti riservati saranno disponibili qui dopo il caricamento tramite il sistema protetto. <strong>Non caricare file riservati nella cartella pubblica del sito.</strong></p><h3>Prossima Gentlemen’s Cup</h3><p>Programma riservato, iscrizioni, quote e dettagli organizzativi: contenuti da completare.</p><h3>Comunicazioni ai soci</h3><p>Gli avvisi del Presidente saranno pubblicati in questa sezione.</p><form method="post" action="/area-soci.html"><input type="hidden" name="action" value="logout"><button type="submit">Esci dall’Area Soci</button></form></section>`);
exports.handler=async event=>{
  const secret=process.env.AREA_SOCI_SESSION_SECRET;
  const encoded=process.env.AREA_SOCI_PASSWORD_HASH;
  if(!secret||secret.length<40||!encoded)return response(503,html('Configurazione necessaria','<section class="panel"><h2>Area Soci in preparazione</h2><p>L’accesso non è ancora configurato. Contatta il Presidente del Club.</p></section>'));
  const cookie=event.headers.cookie||event.headers.Cookie||'';
  if(event.httpMethod==='POST'){
    const body=Buffer.from(event.body||'',event.isBase64Encoded?'base64':'utf8').toString('utf8');
    if(body.length>1024)return response(413,login('Richiesta troppo lunga.'));
    const params=new URLSearchParams(body);
    if(params.get('action')==='logout')return response(303,'',{Location:'/area-soci.html','Set-Cookie':`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`});
    const pass=params.get('password')||'';
    if(checkPassword(pass,encoded)){
      const exp=String(Date.now()+DAYS*86400000);
      return response(303,'',{Location:'/area-soci.html','Set-Cookie':`${COOKIE}=${exp}.${sign(exp,secret)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${DAYS*86400}`});
    }
    return response(401,login('Password non corretta. Riprova.'));
  }
  if(event.httpMethod!=='GET')return response(405,'Metodo non consentito');
  return response(200,validSession(cookie,secret)?members():login());
};
