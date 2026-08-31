/* ============================================================
   lock.js — قفل ماشین‌حساب + تشخیص چهره
   صفحه‌ی اول همیشه یه ماشین‌حساب واقعیه. فقط با وارد کردن یه
   عبارت خاص و بعد تشخیص موفق چهره، اپ واقعی (ForMyHeart) باز می‌شه.
   ============================================================ */

// عبارتی که باید توی ماشین‌حساب محاسبه بشه تا قفل مرحله‌ی اول باز بشه
// می‌تونی این عدد رو به هر چیزی که دوست داری تغییر بدی
const SECRET_TRIGGER = "1207+0"; // یعنی کاربر باید 1207+0= بزنه (نتیجه‌ش 1207 نشون داده می‌شه، کاملاً عادی)
const FACE_MATCH_THRESHOLD = 0.55; // هرچی کمتر، سخت‌گیرتر (پیش‌فرض معمول 0.5-0.6)
const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";

let display = "";
let stage1Unlocked = false;
let stage1Timer = null;

const calcDisplay = document.getElementById("calc-display");
const dot = document.getElementById("secret-dot");

// ---------- منطق ماشین‌حساب واقعی ----------
function calcPress(val){
  if(val === "C"){
    display = "";
  } else if(val === "="){
    evaluateExpression();
    return;
  } else if(val === "⌫"){
    display = display.slice(0, -1);
  } else {
    display += val;
  }
  calcDisplay.textContent = display || "0";
}

function evaluateExpression(){
  const raw = display.trim();

  // چک کردن رمز مخفی (قبل از محاسبه‌ی واقعی)
  if(raw === SECRET_TRIGGER || raw.replace(/\s/g,"") === SECRET_TRIGGER){
    unlockStage1();
  }

  // محاسبه‌ی واقعی و عادی (برای اینکه همیشه شبیه ماشین‌حساب واقعی بمونه)
  try{
    if(!/^[0-9+\-*/.() ]+$/.test(raw)){
      calcDisplay.textContent = "Error";
      display = "";
      return;
    }
    // eslint-disable-next-line no-new-func
    const result = Function('"use strict"; return (' + raw + ")")();
    display = String(result);
    calcDisplay.textContent = display;
  } catch(err){
    calcDisplay.textContent = "Error";
    display = "";
  }
}

// ---------- مرحله‌ی اول: باز شدن نقطه‌ی کوچیک مخفی ----------
function unlockStage1(){
  stage1Unlocked = true;
  dot.classList.add("armed");
  // اگه ظرف ۲۰ ثانیه لمسش نکنه، خودش دوباره قفل می‌شه (ایمنی اضافه)
  clearTimeout(stage1Timer);
  stage1Timer = setTimeout(()=>{
    stage1Unlocked = false;
    dot.classList.remove("armed");
  }, 20000);
}

dot.addEventListener("click", ()=>{
  if(!stage1Unlocked) return; // اگه رمز درست وارد نشده، این نقطه هیچ‌کاری نمی‌کنه
  clearTimeout(stage1Timer);
  openFaceGate();
});

// ---------- مرحله‌ی دوم: تشخیص چهره ----------
const faceOverlay = document.getElementById("face-overlay");
const faceVideo = document.getElementById("face-video");
const faceStatus = document.getElementById("face-status");
const faceCancelBtn = document.getElementById("face-cancel");

let modelsLoaded = false;
let stream = null;

async function ensureModels(){
  if(modelsLoaded) return;
  faceStatus.textContent = "در حال آماده‌سازی...";
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  modelsLoaded = true;
}

async function openFaceGate(){
  faceOverlay.classList.add("open");
  faceStatus.textContent = "در حال بارگذاری...";
  try{
    await ensureModels();
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"user"}});
    faceVideo.srcObject = stream;
    await faceVideo.play();

    const savedDescriptor = localStorage.getItem("fmh_face_descriptor");
    if(!savedDescriptor){
      faceStatus.textContent = "بار اول: صورتتو بیار جلوی دوربین برای ثبت 👤";
    } else {
      faceStatus.textContent = "صورتتو بیار جلوی دوربین...";
    }

    scanLoop(savedDescriptor);
  } catch(err){
    console.error("Camera error:", err);
    faceStatus.textContent = "دسترسی به دوربین ممکن نشد. اجازه‌ی دوربین رو بررسی کن.";
  }
}

function closeFaceGate(){
  faceOverlay.classList.remove("open");
  if(stream){
    stream.getTracks().forEach(t=>t.stop());
    stream = null;
  }
}

faceCancelBtn.addEventListener("click", closeFaceGate);

async function scanLoop(savedDescriptor){
  if(!faceOverlay.classList.contains("open")) return;

  const detection = await faceapi
    .detectSingleFace(faceVideo, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  if(detection){
    if(!savedDescriptor){
      // ثبت اولیه‌ی چهره
      localStorage.setItem("fmh_face_descriptor", JSON.stringify(Array.from(detection.descriptor)));
      faceStatus.textContent = "چهره ثبت شد ✅";
      setTimeout(()=>{
        closeFaceGate();
        window.unlockRealApp();
      }, 700);
      return;
    } else {
      const saved = new Float32Array(JSON.parse(savedDescriptor));
      const distance = faceapi.euclideanDistance(saved, detection.descriptor);
      if(distance < FACE_MATCH_THRESHOLD){
        faceStatus.textContent = "تأیید شد ✅";
        setTimeout(()=>{
          closeFaceGate();
          window.unlockRealApp();
        }, 500);
        return;
      }
    }
  }

  setTimeout(()=> scanLoop(savedDescriptor), 400);
}
