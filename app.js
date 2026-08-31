/* ============================================================
   ForMyHeart — app.js
   با سیستم قفل دو مرحله‌ای (ماشین‌حساب + رمز دوم)
   ============================================================ */

const MESSAGES_URL = FIREBASE_DB_URL + "/messages.json";

// ---------- تنظیمات قفل (اینجا می‌تونی عوض کنی) ----------
const CALC_PIN = "2580";        // پین ماشین‌حساب
const SECOND_PASS = "love";     // رمز دوم

// ---------- هویت کاربر ----------
let myRole  = localStorage.getItem("fmh_role")  || null;
let myName  = localStorage.getItem("fmh_name")  || null;
let partnerRole = null;
let partnerName = null;

// ---------- عناصر قفل ----------
const calcScreen   = document.getElementById("calc-screen");
const passScreen   = document.getElementById("pass-screen");
const setupScreen  = document.getElementById("setup-screen");
const appEl        = document.getElementById("app");
const secretDot    = document.getElementById("secret-dot");
const calcDisplay  = document.getElementById("calc-display");

// وضعیت قفل
let pinUnlocked = false;   // آیا پین ماشین‌حساب درست زده شده؟

// ---------- ماشین‌حساب ----------
let current = "0";
let operator = null;
let previous = null;
let waitingForOperand = false;

function updateDisplay() {
  calcDisplay.textContent = current;
}

function inputDigit(digit) {
  if (waitingForOperand) {
    current = digit;
    waitingForOperand = false;
  } else {
    current = current === "0" ? digit : current + digit;
  }
  updateDisplay();
}

function inputDot() {
  if (waitingForOperand) {
    current = "0.";
    waitingForOperand = false;
  } else if (!current.includes(".")) {
    current += ".";
  }
  updateDisplay();
}

function clearAll() {
  current = "0";
  operator = null;
  previous = null;
  waitingForOperand = false;
  updateDisplay();
}

function toggleSign() {
  current = (parseFloat(current) * -1).toString();
  updateDisplay();
}

function inputPercent() {
  current = (parseFloat(current) / 100).toString();
  updateDisplay();
}

function performOperation(nextOp) {
  const inputValue = parseFloat(current);

  if (previous === null) {
    previous = inputValue;
  } else if (operator) {
    const result = calculate(previous, inputValue, operator);
    current = String(result);
    previous = result;
    updateDisplay();
  }

  waitingForOperand = true;
  operator = nextOp;
}

function calculate(a, b, op) {
  switch (op) {
    case "+": return a + b;
    case "-": return a - b;
    case "*": return a * b;
    case "/": return b !== 0 ? a / b : 0;
    default: return b;
  }
}

function handleEquals() {
  // چک کردن پین مخفی
  if (current === CALC_PIN) {
    pinUnlocked = true;
    secretDot.classList.add("active");   // فقط نقطه‌ی کوچیک روشن می‌شه
    // هیچ پیام یا انیمیشن دیگه‌ای نشون نمی‌دیم
    clearAll();
    return;
  }

  // محاسبه‌ی عادی
  if (operator && previous !== null) {
    const result = calculate(previous, parseFloat(current), operator);
    current = String(result);
    operator = null;
    previous = null;
    waitingForOperand = true;
    updateDisplay();
  }
}

// دکمه‌های ماشین‌حساب
document.querySelectorAll(".calc-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.key;

    if (!isNaN(key)) {
      inputDigit(key);
    } else if (key === ".") {
      inputDot();
    } else if (key === "C") {
      clearAll();
    } else if (key === "±") {
      toggleSign();
    } else if (key === "%") {
      inputPercent();
    } else if (key === "=") {
      handleEquals();
    } else {
      // عملگرها
      performOperation(key);
    }
  });
});

// کلیک روی نقطه‌ی مخفی
secretDot.addEventListener("click", () => {
  if (pinUnlocked) {
    // رفتن به صفحه‌ی رمز دوم
    calcScreen.style.display = "none";
    passScreen.style.display = "flex";
    document.getElementById("second-pass").focus();
  }
});

// ---------- رمز دوم ----------
document.getElementById("pass-confirm").addEventListener("click", checkSecondPass);
document.getElementById("second-pass").addEventListener("keydown", (e) => {
  if (e.key === "Enter") checkSecondPass();
});

function checkSecondPass() {
  const val = document.getElementById("second-pass").value.trim();
  const errorEl = document.getElementById("pass-error");

  if (val === SECOND_PASS) {
    // قفل کامل باز شد
    passScreen.style.display = "none";
    bootApp();
  } else {
    errorEl.textContent = "رمز اشتباه است";
    document.getElementById("second-pass").value = "";
    setTimeout(() => errorEl.textContent = "", 2000);
  }
}

// ---------- شروع اپ اصلی بعد از باز شدن قفل ----------
function bootApp() {
  if (myRole && myName) {
    partnerRole = otherRole(myRole);
    setupScreen.style.display = "none";
    appEl.style.display = "flex";
    startApp();
  } else {
    setupScreen.style.display = "flex";
    appEl.style.display = "none";
    wireSetupScreen();
  }
}

function otherRole(role){ return role === "person1" ? "person2" : "person1"; }

function wireSetupScreen(){
  const nameInput   = document.getElementById("name-input");
  const roleBtns    = document.querySelectorAll(".role-btn");
  const confirmBtn  = document.getElementById("setup-confirm");
  let chosenRole = null;

  roleBtns.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      roleBtns.forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      chosenRole = btn.dataset.role;
      checkReady();
    });
  });
  nameInput.addEventListener("input", checkReady);

  function checkReady(){
    confirmBtn.disabled = !(nameInput.value.trim().length > 0 && chosenRole);
  }

  confirmBtn.addEventListener("click", ()=>{
    myName = nameInput.value.trim();
    myRole = chosenRole;
    localStorage.setItem("fmh_name", myName);
    localStorage.setItem("fmh_role", myRole);
    bootApp();
  });
}

// ---------- شروع اپ اصلی ----------
function startApp(){
  document.getElementById("partner-status").textContent = "منتظر " + (partnerRole === "person1" ? "نفر اول" : "نفر دوم") + "...";
  wireComposer();
  wireHeartButton();
  wireSurpriseModal();
  startPolling();
}

// ---------- نمایش پیام‌ها ----------
const feed = document.getElementById("feed");
const emptyState = document.getElementById("empty-state");
const renderedIds = new Set();

function timeLabel(ts){
  if(!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString("fa-IR", {hour:"2-digit", minute:"2-digit"});
}

function renderMessage(msg){
  const row = document.createElement("div");
  row.className = "row " + (msg.from === myRole ? "me" : "them");

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if(msg.type === "text"){
    bubble.textContent = msg.content;
  } else if(msg.type === "heart"){
    bubble.classList.add("heart-burst");
    const who = msg.from === myRole ? "بهش" : "بهت";
    bubble.textContent = `${msg.fromName || "این آدم"} این‌قدر قلب \( {who} داد ❤️  × \){msg.count}`;
  } else if(msg.type === "surprise"){
    bubble.classList.add("surprise");
    bubble.innerHTML = `<span class="surprise-tag">🎁 SURPRISE</span>`;
    const p = document.createElement("div");
    p.textContent = msg.content;
    bubble.appendChild(p);
  } else if(msg.type === "photo"){
    const img = document.createElement("img");
    img.src = msg.content;
    img.loading = "lazy";
    bubble.appendChild(img);
  }

  const t = document.createElement("span");
  t.className = "bubble-time";
  t.textContent = timeLabel(msg.time);
  bubble.appendChild(t);

  row.appendChild(bubble);
  feed.appendChild(row);
  feed.scrollTop = feed.scrollHeight;
}

// ---------- Polling ----------
let pollFailCount = 0;

async function pollMessages(){
  try{
    const res = await fetch(MESSAGES_URL, {cache:"no-store"});
    if(!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    pollFailCount = 0;

    if(!data) return;

    const entries = Object.entries(data).sort((a,b)=> (a[1].time||0) - (b[1].time||0));

    let totalHearts = 0;
    let newOnes = [];

    for(const [id, msg] of entries){
      if(msg.type === "heart"){
        totalHearts += (msg.count || 0);
      }
      if(!renderedIds.has(id)){
        renderedIds.add(id);
        newOnes.push(msg);
      }
    }

    document.getElementById("total-heart-count").textContent = totalHearts;

    if(newOnes.length > 0 && emptyState){
      emptyState.remove();
    }

    newOnes.forEach(msg=>{
      if(msg.from === partnerRole){
        partnerName = msg.fromName || partnerName;
        document.getElementById("partner-status").textContent = "با " + partnerName + " در ارتباطی 💫";
      }
      renderMessage(msg);
    });

  } catch(err){
    pollFailCount++;
    console.error("Poll error:", err);
    if(pollFailCount === 3){
      showToast("اتصال به دیتابیس برقرار نمی‌شه. اینترنت/VPN رو چک کن.");
    }
  }
}

function startPolling(){
  pollMessages();
  setInterval(pollMessages, 1000);
}

// ---------- ارسال پیام ----------
async function pushMessage(data){
  const payload = {
    from: myRole,
    fromName: myName,
    time: Date.now(),
    ...data
  };
  try{
    const res = await fetch(MESSAGES_URL, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error("HTTP " + res.status);
    const result = await res.json();
    if(result && result.name && !renderedIds.has(result.name)){
      renderedIds.add(result.name);
      if(emptyState) emptyState.remove();
      renderMessage(payload);
      if(payload.type === "heart"){
        const cur = parseInt(document.getElementById("total-heart-count").textContent || "0", 10);
        document.getElementById("total-heart-count").textContent = cur + payload.count;
      }
    }
  } catch(err){
    console.error("Push failed:", err);
    showToast("ارسال ناموفق بود، دوباره امتحان کن.");
  }
}

// ---------- نوار ارسال ----------
function wireComposer(){
  const textInput = document.getElementById("text-input");
  const sendBtn   = document.getElementById("send-btn");
  const photoBtn  = document.getElementById("photo-btn");
  const photoInput= document.getElementById("photo-input");

  function sendText(){
    const val = textInput.value.trim();
    if(!val) return;
    pushMessage({type:"text", content: val});
    textInput.value = "";
    textInput.style.height = "auto";
  }

  sendBtn.addEventListener("click", sendText);
  textInput.addEventListener("keydown", (e)=>{
    if(e.key === "Enter" && !e.shiftKey){
      e.preventDefault();
      sendText();
    }
  });
  textInput.addEventListener("input", ()=>{
    textInput.style.height = "auto";
    textInput.style.height = Math.min(textInput.scrollHeight, 100) + "px";
  });

  photoBtn.addEventListener("click", ()=> photoInput.click());
  photoInput.addEventListener("change", handlePhoto);
}

function showToast(msg){
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(()=> toast.classList.remove("show"), 2500);
}

function handlePhoto(e){
  const file = e.target.files[0];
  if(!file) return;
  if(!file.type.startsWith("image/")){
    showToast("فقط عکس قابل ارساله");
    return;
  }

  const reader = new FileReader();
  reader.onload = (ev)=>{
    const img = new Image();
    img.onload = ()=>{
      const maxDim = 1080;
      let {width, height} = img;
      if(width > maxDim || height > maxDim){
        const ratio = Math.min(maxDim/width, maxDim/height);
        width = Math.round(width*ratio);
        height = Math.round(height*ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.72);

      if(dataUrl.length > 900000){
        showToast("این عکس خیلی سنگینه، یه عکس دیگه امتحان کن");
        return;
      }
      pushMessage({type:"photo", content: dataUrl});
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = "";
}

// ---------- دکمه‌ی قلب ----------
function wireHeartButton(){
  const heartBtn = document.getElementById("heart-btn");
  const badge = document.getElementById("pending-badge");
  let pending = 0;
  let timer = null;

  function flush(){
    if(pending > 0){
      pushMessage({type:"heart", count: pending});
      pending = 0;
      badge.style.display = "none";
      heartBtn.classList.remove("pulsing");
    }
  }

  function spawnMiniHeart(){
    const rect = heartBtn.getBoundingClientRect();
    const mh = document.createElement("div");
    mh.className = "mini-heart";
    mh.textContent = "❤️";
    mh.style.left = (rect.left + rect.width/2 + (Math.random()*30-15)) + "px";
    mh.style.top  = (rect.top - 6) + "px";
    document.body.appendChild(mh);
    setTimeout(()=> mh.remove(), 1000);
  }

  heartBtn.addEventListener("click", ()=>{
    pending += 1;
    badge.textContent = pending;
    badge.style.display = "flex";
    heartBtn.classList.add("pulsing");
    spawnMiniHeart();

    if(timer) clearTimeout(timer);
    timer = setTimeout(flush, 3000);
  });

  window.addEventListener("beforeunload", flush);
  document.addEventListener("visibilitychange", ()=>{
    if(document.hidden) flush();
  });
}

// ---------- مودال Surprise ----------
let surpriseTexts = [];
let surpriseMode = "random";
let currentRandomText = "";

function wireSurpriseModal(){
  surpriseTexts = generateSurpriseTexts();

  const modal      = document.getElementById("surprise-modal");
  const openBtn    = document.getElementById("surprise-open-btn");
  const modeRandom = document.getElementById("mode-random");
  const modeCustom = document.getElementById("mode-custom");
  const previewWrap= document.getElementById("surprise-preview-wrap");
  const shuffleBtn = document.getElementById("surprise-shuffle");
  const sendBtn    = document.getElementById("surprise-send");

  function renderRandomMode(){
    previewWrap.innerHTML = `<span id="surprise-random-text">${currentRandomText || "دکمه‌ی «متن جدید» رو بزن تا یه متن قشنگ ببینی ✨"}</span>`;
    shuffleBtn.style.display = "block";
  }
  function renderCustomMode(){
    previewWrap.innerHTML = `<textarea id="custom-surprise-text" placeholder="متن دلخواهت رو اینجا بنویس..."></textarea>`;
    shuffleBtn.style.display = "none";
  }

  openBtn.addEventListener("click", ()=>{
    modal.classList.add("open");
    if(surpriseMode === "random") renderRandomMode(); else renderCustomMode();
  });
  modal.addEventListener("click", (e)=>{ if(e.target === modal) modal.classList.remove("open"); });

  modeRandom.addEventListener("click", ()=>{
    surpriseMode = "random";
    modeRandom.classList.add("active");
    modeCustom.classList.remove("active");
    renderRandomMode();
  });
  modeCustom.addEventListener("click", ()=>{
    surpriseMode = "custom";
    modeCustom.classList.add("active");
    modeRandom.classList.remove("active");
    renderCustomMode();
  });

  shuffleBtn.addEventListener("click", ()=>{
    currentRandomText = surpriseTexts[Math.floor(Math.random()*surpriseTexts.length)];
    renderRandomMode();
  });

  sendBtn.addEventListener("click", ()=>{
    let text = "";
    if(surpriseMode === "random"){
      text = currentRandomText;
      if(!text){ showToast("اول یه متن تصادفی انتخاب کن"); return; }
    } else {
      text = document.getElementById("custom-surprise-text").value.trim();
      if(!text){ showToast("یه متن بنویس"); return; }
    }
    pushMessage({type:"surprise", content: text});
    modal.classList.remove("open");
    currentRandomText = "";
  });
}

// ---------- شروع ----------
// اول ماشین‌حساب نشون داده می‌شه
// بعد از باز شدن قفل، bootApp() صدا زده می‌شه
