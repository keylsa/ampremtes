/*
╔══════════════════════════════════════════════╗
║       👑  𝑹𝑰𝑴𝑼𝑹𝑼 𝑴𝑫 〽️                        ║
╚══════════════════════════════════════════════╝
        ⚠️ 𝑫𝑶 𝑵𝑶𝑻 𝑹𝑬𝑴𝑶𝑽𝑬 𝑪𝑹𝑬𝑫𝑰𝑻 ⚠️
                 「 👑 𝑹𝑰𝑴𝑼𝑹𝑼 𝑴𝑫 👑 」
*/

const API_URL = "/api/amprem";

const $ = (id) => document.getElementById(id);
const emailInput = $("email");
const emailInput2 = $("email-2");
const linkInput = $("link");
const btnSend = $("btn-send");
const btnVerify = $("btn-verify");
const btnBack = $("btn-back");
const btnRestart = $("btn-restart");

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validLink(link) {
  try {
    const u = new URL(link);
    return /^https?:$/.test(u.protocol);
  } catch {
    return false;
  }
}

function setStep(n) {
  document.querySelectorAll(".step").forEach((el, i) => {
    el.classList.remove("active", "done");
    if (i + 1 < n) el.classList.add("done");
    if (i + 1 === n) el.classList.add("active");
  });
}

function showPanel(n) {
  document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
  $("panel-" + n).classList.add("active");
  setStep(n);
}

function setNotice(id, type, message) {
  const el = $(id);
  el.className = "notice show " + type;
  el.innerHTML = message;
}

function clearNotice(id) {
  $(id).className = "notice";
  $(id).innerHTML = "";
}

function setLoading(btn, loading, originalText) {
  btn.disabled = loading;
  if (loading) {
    btn.innerHTML = '<div class="spinner"></div><span>Memproses...</span>';
  } else {
    btn.innerHTML = '<span>' + originalText + '</span>';
  }
}

async function apiPost(action, data) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...data }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || result.success === false) {
    throw new Error(result.message || result.error || "API mengembalikan HTTP " + res.status);
  }
  return result;
}

/* ============================================
   STEP 1 — Kirim magic link
   ============================================ */
btnSend.addEventListener("click", async () => {
  clearNotice("notice-1");
  const email = emailInput.value.trim();

  if (!email) {
    return setNotice("notice-1", "error", "⚠️ Masukkan email terlebih dahulu.");
  }
  if (!validEmail(email)) {
    return setNotice("notice-1", "error", "⚠️ Format email tidak valid.");
  }

  setLoading(btnSend, true, "Kirim Link Verifikasi");
  try {
    await apiPost("send-magiclink", { email });
    setNotice(
      "notice-1",
      "success",
      "✅ Link verifikasi berhasil dikirim ke <b>" + email + "</b>.<br/>" +
      "Cek inbox / folder <b>Spam</b>, lalu lanjut ke langkah 2."
    );
    emailInput2.value = email;
    setTimeout(() => showPanel(2), 1200);
  } catch (err) {
    setNotice("notice-1", "error", "❌ " + (err.message || "Gagal mengirim link."));
  } finally {
    setLoading(btnSend, false, "Kirim Link Verifikasi");
  }
});

/* ============================================
   STEP 2 — Verifikasi + Apply Premium (single call)
   ============================================ */
btnVerify.addEventListener("click", async () => {
  clearNotice("notice-2");
  const email = emailInput2.value.trim();
  const link = linkInput.value.trim();

  if (!email || !validEmail(email)) {
    return setNotice("notice-2", "error", "⚠️ Email tidak valid. Kembali ke langkah 1.");
  }
  if (!link) {
    return setNotice("notice-2", "error", "⚠️ Tempel link verifikasi dari email kamu.");
  }
  if (!validLink(link)) {
    return setNotice(
      "notice-2",
      "error",
      "⚠️ Link tidak valid. Pastikan full URL diawali <code>http://</code> atau <code>https://</code>."
    );
  }

  setLoading(btnVerify, true, "Verifikasi & Aktifkan Premium");
  try {
    await apiPost("verify-and-apply", { email, rawLink: link });
    $("success-msg").innerHTML =
      "📧 Email: <b>" + email + "</b><br/>✨ Status: <b>Premium berhasil diproses</b>";
    showPanel(3);
  } catch (err) {
    setNotice(
      "notice-2",
      "error",
      "❌ <b>Proses gagal</b><br/>" +
        (err.message || "Terjadi kesalahan pada API.") +
        "<br/><br/>Jika link sudah benar tapi gagal, kirim ulang link baru dari langkah 1."
    );
  } finally {
    setLoading(btnVerify, false, "Verifikasi & Aktifkan Premium");
  }
});

/* ============================================
   NAVIGATION
   ============================================ */
btnBack.addEventListener("click", () => {
  clearNotice("notice-2");
  showPanel(1);
});

btnRestart.addEventListener("click", () => {
  emailInput.value = "";
  emailInput2.value = "";
  linkInput.value = "";
  clearNotice("notice-1");
  clearNotice("notice-2");
  showPanel(1);
});

/* ============================================
   ENTER KEY SUPPORT
   ============================================ */
emailInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnSend.click();
});

linkInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnVerify.click();
});
