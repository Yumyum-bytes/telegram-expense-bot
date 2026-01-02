import express from "express";
import fetch from "node-fetch";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CONFIG } from "./config.js";

/* ---------- PATH SETUP ---------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------- LOAD FIREBASE JSON ---------- */
const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, "firebase.json"), "utf8")
);

/* ---------- INIT ---------- */
const app = express();
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

/* ---------- TELEGRAM WEBHOOK ---------- */
app.post("/", async (req, res) => {
  res.send("OK"); // Telegram ko fast response

  try {
    const msg = req.body.message;
    if (!msg) return;

    const chatId = msg.chat.id.toString();
    if (chatId !== CONFIG.AUTHORIZED_USER_ID) return;

    const text = msg.text;
    if (!text) return;

    // 🔥 SMART PARSER (AI + FALLBACK)
    const expense = await parseExpense(text);

    if (!expense) {
      await sendMessage(chatId, "❌ Amount nahi mila");
      return;
    }

    await db.collection("expenses").add({
      ...expense,
      createdAt: new Date(),
    });

    await sendMessage(
      chatId,
      `✅ Saved\n₹${expense.amount} | ${expense.category}`
    );
  } catch (err) {
    console.log("Error:", err.message);
  }
});

/* ---------- MAIN PARSER ---------- */
async function parseExpense(text) {
  // 1️⃣ Try AI
  try {
    const ai = await extractUsingAI(text);
    if (ai && ai.amount) return ai;
  } catch (e) {}

  // 2️⃣ Fallback REGEX (AI fail ho to bhi kaam kare)
  const match = text.match(/(\d+)/);
  if (!match) return null;

  return {
    type: "Debit",
    amount: Number(match[1]),
    category: guessCategory(text),
    mode: guessMode(text),
    remarks: text,
    date: "Today",
  };
}

/* ---------- GEMINI AI ---------- */
async function extractUsingAI(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

  const prompt = `
You are an expense extractor.
User text: "${text}"

Return ONLY JSON.
Always guess if unsure.

Fields:
type: "Debit"
amount: number
category: short word
mode: cash/upi/card/unknown
remarks: original text
date: Today or YYYY-MM-DD
`;

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const j = await r.json();
  if (!j.candidates) return null;

  const clean = j.candidates[0].content.parts[0].text
    .replace(/```json|```/g, "")
    .trim();

  return JSON.parse(clean);
}

/* ---------- HELPERS ---------- */
function guessCategory(text) {
  const t = text.toLowerCase();
  if (t.includes("chai")) return "chai";
  if (t.includes("petrol")) return "petrol";
  if (t.includes("food")) return "food";
  return "misc";
}

function guessMode(text) {
  const t = text.toLowerCase();
  if (t.includes("upi")) return "upi";
  if (t.includes("cash")) return "cash";
  if (t.includes("card")) return "card";
  return "unknown";
}

/* ---------- TELEGRAM SEND ---------- */
async function sendMessage(chatId, text) {
  await fetch(
    `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    }
  );
}

/* ---------- SERVER ---------- */
app.listen(3000, () => {
  console.log("🚀 Expense bot running on port 3000");
});
