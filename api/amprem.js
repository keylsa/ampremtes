/*
╔══════════════════════════════════════════════╗
║       👑  𝑹𝑰𝑴𝑼𝑹𝑼 𝑴𝑫 〽️                        ║
╚══════════════════════════════════════════════╝
        ⚠️ 𝑫𝑶 𝑵𝑶𝑻 𝑹𝑬𝑴𝑶𝑽𝑬 𝑪𝑹𝑬𝑫𝑰𝑻 ⚠️
                 「 👑 𝑹𝑰𝑴𝑼𝑹𝑼 𝑴𝑫 👑 」
*/

import axios from "axios";

const API_URL =
  process.env.ALIGHT_API_URL ||
  "https://anita-studio.netlify.app/.netlify/functions/amprem";

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  : ["*"];

/* ---------- Utilities ---------- */

function validEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validLink(link) {
  try {
    const u = new URL(link);
    return /^https?:$/.test(u.protocol);
  } catch {
    return false;
  }
}

async function apiPost(action, data) {
  const response = await axios.post(
    API_URL,
    { action, ...data },
    {
      timeout: 45_000,
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true,
    }
  );

  const result = response.data || {};

  if (response.status < 200 || response.status >= 300 || result.success === false) {
    throw new Error(
      result.message || result.error || `API mengembalikan HTTP ${response.status}`
    );
  }

  return result;
}

function extractIdToken(verification) {
  return (
    verification?.idToken ||
    verification?.profile?.idToken ||
    verification?.data?.idToken ||
    verification?.result?.idToken
  );
}

function sendError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

/* ---------- Handler ---------- */

export default async function handler(req, res) {
  // ---- CORS ----
  const origin = req.headers.origin || "*";
  const allowed = ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin);
  res.setHeader("Access-Control-Allow-Origin", allowed ? origin : "null");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // ---- GET: dokumentasi API ----
  if (req.method === "GET") {
    return res.status(200).json({
      name: "RIMURU MD — Alight Motion Premium API",
      version: "1.0.0",
      methods: ["POST"],
      actions: {
        "send-magiclink": {
          body: { action: "send-magiclink", email: "user@example.com" },
          note: "Mirip .amprem22 — kirim link verifikasi ke email",
        },
        "verify-account": {
          body: {
            action: "verify-account",
            email: "user@example.com",
            rawLink: "https://...",
          },
          note: "Step 1 dari .amverif22 — verifikasi link & dapat idToken",
        },
        "apply-premium": {
          body: {
            action: "apply-premium",
            email: "user@example.com",
            idToken: "...",
          },
          note: "Step 2 dari .amverif22 — aktifkan premium",
        },
        "verify-and-apply": {
          body: {
            action: "verify-and-apply",
            email: "user@example.com",
            rawLink: "https://...",
          },
          note: "Full flow .amverif22 — verify + apply dalam 1 request",
        },
      },
    });
  }

  // ---- Hanya POST ----
  if (req.method !== "POST") {
    return sendError(res, 405, "Method not allowed. Gunakan POST.");
  }

  // ---- Parse body ----
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return sendError(res, 400, "Body bukan JSON yang valid.");
    }
  }
  if (!body || typeof body !== "object") {
    return sendError(res, 400, "Body harus berupa JSON object.");
  }

  const { action } = body;

  try {
    /* ============================================================
       ACTION: send-magiclink  (mirip .amprem22)
       ============================================================ */
    if (action === "send-magiclink") {
      const { email } = body;
      if (!email) return sendError(res, 400, "Field 'email' wajib diisi.");
      if (!validEmail(email)) return sendError(res, 400, "Format email tidak valid.");

      await apiPost("send-magiclink", { email });

      return res.status(200).json({
        success: true,
        action,
        email,
        message: `Link verifikasi terkirim ke ${email}. Cek inbox/spam dari noreply, lalu lanjutkan verifikasi.`,
      });
    }

    /* ============================================================
       ACTION: verify-account  (step 1 .amverif22)
       ============================================================ */
    if (action === "verify-account") {
      const { email } = body;
      const rawLink = body.rawLink || body.link;

      if (!email) return sendError(res, 400, "Field 'email' wajib diisi.");
      if (!validEmail(email)) return sendError(res, 400, "Format email tidak valid.");
      if (!rawLink) return sendError(res, 400, "Field 'rawLink' wajib diisi.");
      if (!validLink(rawLink)) {
        return sendError(
          res,
          400,
          "Link verifikasi tidak valid (harus diawali http:// atau https://)."
        );
      }

      const verification = await apiPost("verify-account", { email, rawLink });
      const idToken = extractIdToken(verification);

      if (!idToken) {
        return sendError(
          res,
          400,
          verification?.message ||
            "Verifikasi tidak mengembalikan idToken. Proses dihentikan."
        );
      }

      return res.status(200).json({
        success: true,
        action,
        email,
        idToken,
        message: "Akun terverifikasi.",
      });
    }

    /* ============================================================
       ACTION: apply-premium  (step 2 .amverif22)
       ============================================================ */
    if (action === "apply-premium") {
      const { email, idToken } = body;
      if (!email) return sendError(res, 400, "Field 'email' wajib diisi.");
      if (!validEmail(email)) return sendError(res, 400, "Format email tidak valid.");
      if (!idToken) return sendError(res, 400, "Field 'idToken' wajib diisi.");

      const result = await apiPost("apply-premium", { email, idToken });

      return res.status(200).json({
        success: true,
        action,
        email,
        message: "Premium berhasil diproses.",
        data: result,
      });
    }

    /* ============================================================
       ACTION: verify-and-apply  (persis .amverif22 — combined)
       ============================================================ */
    if (action === "verify-and-apply" || action === "amverif22") {
      const { email } = body;
      const rawLink = body.rawLink || body.link;

      if (!email) return sendError(res, 400, "Field 'email' wajib diisi.");
      if (!validEmail(email)) return sendError(res, 400, "Format email tidak valid.");
      if (!rawLink) return sendError(res, 400, "Field 'rawLink' wajib diisi.");
      if (!validLink(rawLink)) {
        return sendError(
          res,
          400,
          "Link verifikasi tidak valid (harus diawali http:// atau https://)."
        );
      }

      // Step 1 — verify
      const verification = await apiPost("verify-account", { email, rawLink });
      const idToken = extractIdToken(verification);

      if (!idToken) {
        throw new Error(
          verification?.message ||
            "Verifikasi tidak mengembalikan idToken. Proses dihentikan."
        );
      }

      // Step 2 — apply premium
      await apiPost("apply-premium", { email, idToken });

      return res.status(200).json({
        success: true,
        action: "verify-and-apply",
        email,
        message: "Premium berhasil diproses.",
      });
    }

    /* ============================================================
       ACTION tidak dikenal
       ============================================================ */
    return sendError(
      res,
      400,
      `Action '${action || "undefined"}' tidak dikenal. ` +
        `Gunakan salah satu: send-magiclink, verify-account, apply-premium, verify-and-apply.`
    );
  } catch (err) {
    return sendError(res, 502, err?.message || "Terjadi kesalahan pada API.");
  }
}
