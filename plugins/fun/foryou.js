const fs = require('fs');
const path = require('path');

const pluginConfig = {
    name: 'foryou',
    category: 'fun',
    description: 'Membuat halaman surat cinta interaktif dengan PIN & proposal untuk crush',
    usage: '.foryou <nama> | <pin_6_digit> | <isi_surat>',
    example: '.foryou Clarin | 270709 | Aku suka kamu dari pertama kali kita sekelompok bareng...',
    cooldown: 5,
    energi: 0,
    isOwner: false,
    isEnabled: true
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Ubah teks biasa (dengan enter) jadi paragraf-paragraf HTML yang rapi
function formatLetterBody(text) {
    return text
        .split(/\n{2,}/)
        .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
        .join('');
}

async function handler(m, { sock, args }) {
    try {
        const text = args.join(" ");

        if (!text.includes('|')) {
            return m.reply(`⚠️ *Format Salah*\n\n> Gunakan tanda *|* sebagai pemisah nama, PIN, dan isi surat.\nContoh: \`${m.prefix || '.'}foryou Nama Crush | 270709 | Isi surat kamu di sini...\``);
        }

        const parts = text.split('|').map(s => s.trim());
        const nama = parts[0];
        const pin = parts[1];
        const isiSurat = parts[2];

        if (!nama || !pin || !isiSurat) {
            return m.reply(`⚠️ *Parameter Belum Lengkap*\n\n> Pastikan nama, PIN, dan isi surat semuanya sudah terisi.\nContoh: \`${m.prefix || '.'}foryou Nama Crush | 270709 | Isi surat kamu di sini...\``);
        }

        if (!/^\d{6}$/.test(pin)) {
            return m.reply(`⚠️ *PIN Tidak Valid*\n\n> PIN harus terdiri dari tepat *6 digit angka*.\nContoh PIN: \`270709\``);
        }

        await m.react('⏳');

        const safeNama = escapeHtml(nama);
        const safePin = escapeHtml(pin);
        const letterBodyHtml = formatLetterBody(isiSurat);

        const htmlContent = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Special For You ♡</title>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400;500&family=Great+Vibes&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js"></script>
    <style>
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      :root{--blush:#f7c5c5;--rose:#e87ea1;--deep:#c0445e;--petal:#fde8ec;--cream:#fff8f9;--ink:#3a1f28;--muted:#9b6675}
      body{font-family:"DM Sans",sans-serif;min-height:100vh;display:flex;justify-content:center;align-items:center;overflow:hidden;background:var(--petal);position:relative}
      .hearts-bg{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
      .hb{position:absolute;bottom:-60px;animation:floatUp linear infinite;opacity:0;font-size:1.4rem;filter:blur(.4px)}
      @keyframes floatUp{0%{transform:translateY(0) rotate(0deg);opacity:0}10%{opacity:.45}90%{opacity:.3}100%{transform:translateY(-110vh) rotate(25deg);opacity:0}}
      .card{position:relative;z-index:10;width:min(92vw,460px);max-height:90vh;overflow-y:auto;background:var(--cream);border-radius:28px;padding:48px 40px 44px;box-shadow:0 2px 8px rgba(192,68,94,.08),0 16px 48px rgba(192,68,94,.14),0 0 0 1px rgba(232,126,161,.18);text-align:center}
      .card::-webkit-scrollbar{width:5px}
      .card::-webkit-scrollbar-thumb{background:rgba(232,126,161,.4);border-radius:10px}
      .section{display:none}.section.active{display:block;animation:fadeUp .8s cubic-bezier(.22,1,.36,1) both}
      @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
      .divider{display:flex;align-items:center;gap:10px;margin:18px 0;color:var(--blush);font-size:.85rem;letter-spacing:.08em}
      .divider::before,.divider::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--blush),transparent)}
      /* STEP 1 */
      .intro-sub{font-weight:300;font-size:.85rem;color:var(--muted);letter-spacing:.12em;text-transform:uppercase;margin-bottom:14px}
      .intro-title{font-family:"Great Vibes",cursive;font-size:2.6rem;color:var(--deep);line-height:1.25;overflow:hidden;white-space:nowrap;width:0;margin:0 auto 6px;animation:typeIn 2.4s steps(30,end) .4s forwards}
      .intro-name{font-family:"Great Vibes",cursive;font-size:4rem;color:var(--rose);overflow:hidden;white-space:nowrap;width:0;margin:0 auto;animation:typeIn 1.4s steps(20,end) 2.9s forwards}
      @keyframes typeIn{from{width:0}to{width:100%}}
      .intro-heart{font-size:2.8rem;display:block;margin-top:20px;animation:pulse 1.6s ease-in-out 4s infinite}
      @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
      /* STEP 2 */
      .step-label{font-family:"Cormorant Garamond",serif;font-size:1.5rem;font-style:italic;color:var(--ink);margin-bottom:6px}
      .step-hint{font-size:.78rem;color:var(--muted);margin-bottom:28px;letter-spacing:.04em}
      .pin-dots{display:flex;justify-content:center;gap:12px;margin-bottom:32px}
      .dot{width:16px;height:16px;border-radius:50%;border:2px solid var(--rose);transition:background .25s,box-shadow .25s}
      .dot.filled{background:var(--rose);box-shadow:0 0 10px rgba(232,126,161,.55)}
      .dot.shake{animation:shakeDot .4s ease}
      @keyframes shakeDot{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
      .numpad{display:grid;grid-template-columns:repeat(3,64px);gap:12px;margin:0 auto;width:fit-content}
      .num-btn{width:64px;height:64px;border-radius:50%;border:1.5px solid var(--blush);background:var(--petal);color:var(--ink);font-family:"DM Sans",sans-serif;font-size:1.25rem;font-weight:500;cursor:pointer;transition:background .15s,border-color .15s,transform .1s;display:flex;align-items:center;justify-content:center}
      .num-btn:hover{background:var(--blush);border-color:var(--rose)}
      .num-btn:active{transform:scale(.93);background:var(--rose);color:#fff}
      .clear-btn{font-size:.7rem;letter-spacing:.06em;color:var(--muted)}
      /* STEP 3 */
      .letter-wrap{background:var(--petal);border-radius:16px;padding:28px 26px;text-align:left;border:1px solid rgba(232,126,161,.25)}
      .letter-greeting{font-family:"Cormorant Garamond",serif;font-size:1.15rem;font-style:italic;color:var(--deep);margin-bottom:12px}
      .letter-body{font-size:.88rem;color:var(--ink);line-height:1.8;font-weight:300}
      .letter-body p+p{margin-top:14px}
      .letter-sign{margin-top:18px;font-family:"Great Vibes",cursive;font-size:1.6rem;color:var(--rose);text-align:right}
      /* STEP 4 */
      .proposal-q{font-family:"Cormorant Garamond",serif;font-size:1.8rem;font-style:italic;color:var(--ink);line-height:1.35;margin-bottom:8px}
      .proposal-sub{font-size:.82rem;color:var(--muted);margin-bottom:32px}
      .btn-row{display:flex;justify-content:center;gap:16px;position:relative;min-height:52px}
      /* STEP 5 */
      .celebrate-icon{font-size:3.2rem;margin-bottom:16px;display:block;animation:bounce .6s ease infinite alternate}
      @keyframes bounce{from{transform:translateY(0)}to{transform:translateY(-10px)}}
      .celebrate-title{font-family:"Cormorant Garamond",serif;font-size:2rem;font-style:italic;color:var(--deep);margin-bottom:10px}
      .celebrate-msg{font-size:.85rem;color:var(--muted);line-height:1.7;margin-bottom:22px}
      textarea{width:100%;border-radius:12px;border:1.5px solid var(--blush);padding:14px 16px;font-family:"DM Sans",sans-serif;font-size:.85rem;color:var(--ink);background:var(--petal);resize:none;height:90px;outline:none;transition:border-color .2s}
      textarea:focus{border-color:var(--rose)}
      /* BUTTONS */
      .btn{display:inline-flex;align-items:center;gap:8px;padding:13px 28px;border-radius:50px;border:none;font-family:"DM Sans",sans-serif;font-size:.9rem;font-weight:500;cursor:pointer;transition:transform .15s,box-shadow .15s}
      .btn-primary{background:linear-gradient(135deg,var(--rose),var(--deep));color:#fff;box-shadow:0 4px 18px rgba(192,68,94,.3)}
      .btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(192,68,94,.38)}
      .btn-primary:active{transform:scale(.97)}
      .btn-ghost{background:var(--petal);color:var(--muted);border:1.5px solid var(--blush)}
      .btn-ghost:hover{background:var(--blush)}
      #noBtn{position:relative;transition:left .05s,top .05s}
      .swal2-popup{border-radius:22px!important;font-family:"DM Sans",sans-serif!important}
      .swal2-title{font-family:"Cormorant Garamond",serif!important;font-style:italic}
      @media (max-width:380px){
        .card{padding:36px 24px 32px}
        .intro-name{font-size:3.1rem}
        .num-btn{width:56px;height:56px}
        .numpad{grid-template-columns:repeat(3,56px)}
      }
    </style>
  </head>
  <body>
    <div class="hearts-bg" id="heartsBg"></div>
    <div class="card">

      <!-- STEP 1: INTRO -->
      <div id="step1" class="section active">
        <p class="intro-sub">a little something</p>
        <h1 class="intro-title">I made this just for</h1>
        <h1 class="intro-name">${safeNama}</h1>
        <span class="intro-heart">🤍</span>
      </div>

      <!-- STEP 2: PIN -->
      <div id="step2" class="section">
        <p class="step-label">Enter the secret code</p>
        <p class="step-hint">🔐 Only you know this</p>
        <div class="pin-dots" id="pinDots">
          <div class="dot"></div><div class="dot"></div>
          <div class="dot"></div><div class="dot"></div>
          <div class="dot"></div><div class="dot"></div>
        </div>
        <div class="numpad">
          <button class="num-btn" onclick="pressNum('1')">1</button>
          <button class="num-btn" onclick="pressNum('2')">2</button>
          <button class="num-btn" onclick="pressNum('3')">3</button>
          <button class="num-btn" onclick="pressNum('4')">4</button>
          <button class="num-btn" onclick="pressNum('5')">5</button>
          <button class="num-btn" onclick="pressNum('6')">6</button>
          <button class="num-btn" onclick="pressNum('7')">7</button>
          <button class="num-btn" onclick="pressNum('8')">8</button>
          <button class="num-btn" onclick="pressNum('9')">9</button>
          <div></div>
          <button class="num-btn" onclick="pressNum('0')">0</button>
          <button class="num-btn clear-btn" onclick="clearPin()">⌫</button>
        </div>
      </div>

      <!-- STEP 3: LETTER -->
      <div id="step3" class="section">
        <div class="divider">💌 a letter for you</div>
        <div class="letter-wrap">
          <p class="letter-greeting">Hai ${safeNama},</p>
          <div class="letter-body">${letterBodyHtml}</div>
          <p class="letter-sign">— with love</p>
        </div>
        <div style="margin-top:28px">
          <button class="btn btn-primary" onclick="nextStep(4)">Buka rahasianya &nbsp;→</button>
        </div>
      </div>

      <!-- STEP 4: PROPOSAL -->
      <div id="step4" class="section">
        <span style="font-size:2.6rem;display:block;margin-bottom:18px">💗</span>
        <p class="proposal-q">"Will you be<br>my girlfriend?"</p>
        <p class="proposal-sub">Jawab jujur ya 🥺</p>
        <div class="btn-row">
          <button id="yesBtn" class="btn btn-primary" onclick="celebrate()">💗 Yes!</button>
          <button id="noBtn"  class="btn btn-ghost"   onmouseover="moveNo()" onclick="moveNo()">No</button>
        </div>
      </div>

      <!-- STEP 5: CELEBRATE -->
      <div id="step5" class="section">
        <span class="celebrate-icon">🎉</span>
        <p class="celebrate-title">Yeay, kamu mau! ❤️</p>
        <p class="celebrate-msg">
          You just made me the happiest person alive. 🤍<br>
          I promise I'll always take care of your heart.<br><br>
          Sekarang kasih tau aku, <strong>date pertama kita mau ngapain?</strong>
        </p>
        <textarea id="dateIdea" placeholder="Tulis rencana date kita..."></textarea>
        <div style="margin-top:14px">
          <button class="btn btn-primary" onclick="saveDate()">Kirim 💌</button>
        </div>
      </div>

    </div><!-- /card -->
    <script>
      const EMOJIS=['🤍','💗','💕','♡','💖','🩷','❤️'];
      const bg=document.getElementById('heartsBg');
      const heartCount=window.innerWidth<480?16:28;
      for(let i=0;i<heartCount;i++){
        const h=document.createElement('span');
        h.className='hb';
        h.textContent=EMOJIS[Math.floor(Math.random()*EMOJIS.length)];
        h.style.left=Math.random()*100+'vw';
        h.style.fontSize=(.8+Math.random()*1.2)+'rem';
        h.style.animationDuration=(9+Math.random()*14)+'s';
        h.style.animationDelay=(Math.random()*14)+'s';
        bg.appendChild(h);
      }
      function nextStep(n){
        document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
        document.getElementById('step'+n).classList.add('active');
      }
      setTimeout(()=>nextStep(2),5200);

      let pin='';
      const CORRECT='${safePin}';
      let wrongAttempts=0;

      function pressNum(d){
        if(pin.length>=6)return;
        pin+=d;updateDots();
        if(pin.length===6){
          if(pin===CORRECT){
            setTimeout(()=>nextStep(3),480);
          }else{
            wrongAttempts++;
            setTimeout(()=>{
              document.querySelectorAll('.dot').forEach(d=>d.classList.add('shake'));
              Swal.fire({
                title:'PIN Salah!',
                text: wrongAttempts>=3
                  ? 'Masih salah nih... coba ingat-ingat tanggal spesial ya 😉'
                  : 'Hmm, coba lagi ya 😜',
                icon:'error',
                confirmButtonColor:'#c0445e'
              });
              setTimeout(()=>{
                clearPin();
                document.querySelectorAll('.dot').forEach(d=>d.classList.remove('shake'));
              },400);
            },200);
          }
        }
      }
      function clearPin(){pin='';updateDots()}
      function updateDots(){document.querySelectorAll('.dot').forEach((d,i)=>d.classList.toggle('filled',i<pin.length))}

      function moveNo(){
        const b=document.getElementById('noBtn');
        const margin=20;
        b.style.position='fixed';
        b.style.left=Math.random()*(window.innerWidth-b.offsetWidth-margin*2)+margin+'px';
        b.style.top=Math.random()*(window.innerHeight-b.offsetHeight-margin*2)+margin+'px';
      }
      function celebrate(){
        const c=['#f7c5c5','#e87ea1','#c0445e','#fde8ec','#ffffff'];
        confetti({particleCount:160,spread:80,origin:{y:.55},colors:c});
        setTimeout(()=>confetti({particleCount:80,angle:60,spread:55,origin:{x:0},colors:c}),300);
        setTimeout(()=>confetti({particleCount:80,angle:120,spread:55,origin:{x:1},colors:c}),500);
        setTimeout(()=>nextStep(5),2200);
      }
      function saveDate(){
        const idea=document.getElementById('dateIdea').value.trim();
        if(!idea){Swal.fire({text:'Isi dulu rencananya ya! 🥺',icon:'warning',confirmButtonColor:'#c0445e'});return}
        Swal.fire({
          title:'Tersimpan! 💌',
          html:'Rencana <b>"'+idea.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'"</b> udah aku catat!<br><br>Jangan lupa kirim screenshot ini ke aku ya 🤍',
          icon:'success',
          confirmButtonColor:'#c0445e',
          confirmButtonText:'Siap!'
        });
      }
    </script>
  </body>
</html>`;

        const tmpDir = path.join(__dirname, '../../src/data/tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        const fileName = `Surat_Untuk_${nama.replace(/\s+/g, '_')}.html`;
        const filePath = path.join(tmpDir, fileName);

        fs.writeFileSync(filePath, htmlContent, 'utf-8');

        await sock.sendMessage(m.chat, {
            document: fs.readFileSync(filePath),
            fileName: fileName,
            mimetype: 'text/html',
            caption: `✨ *FORYOU LETTER GENERATOR* ✨\n\n> Halaman romantis untuk *${nama}* berhasil dibuat!\n> PIN: *${pin}*\n> Kirimkan file ini ke dia, lalu bagikan PIN-nya secara terpisah (misal lewat chat langsung) biar tetap jadi kejutan 😉`
        }, { quoted: m });

        await m.react('✅');

        setTimeout(() => {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }, 5000);

    } catch (error) {
        await m.react('❌');
        return m.reply(`❌ Error: ${error.message}`);
    }
}

module.exports = { config: pluginConfig, handler }