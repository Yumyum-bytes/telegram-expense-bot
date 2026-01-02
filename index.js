import express from "express";
import fetch from "node-fetch";
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CONFIG } from "./config.js";

// ===== Path Fix =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Load Firebase JSON SAFELY =====
const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, "firebase.json"), "utf8")
);

const app = express();
app.use(express.json());

// ===== FIREBASE INIT =====
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ===== TELEGRAM WEBHOOK =====
app.post("/", async (req, res) => {
  res.send("OK"); // fast response

  try {
    const message = req.body.message;
    if (!message) return;

    const chatId = message.chat.id.toString();
    if (chatId !== CONFIG.AUTHORIZED_USER_ID) return;

    const text = message.text;
    if (!text) return;

    const expense = await extractExpenseUsingAI(text);
    if (!expense) {
      await sendMessage(chatId, "❌ Samajh nahi aaya, thoda clear bolo");
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
    console.log("❌ Error:", err.message);
  }
});

// ===== GEMINI AI =====
async function extractExpenseUsingAI(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

  const prompt = `
Extract expense details as JSON only.

Text: "${text}"

Fields:
type (Debit/Credit)
amount (number)
category
mode
remarks
date (YYYY-MM-DD or Today)
`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const json = await response.json();
  if (!json.candidates) return null;

  const cleanText = json.candidates[0].content.parts[0].text
    .replace(/```json|```/g, "")
    .trim();

  return JSON.parse(cleanText);
}

// ===== TELEGRAM SEND =====
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

// ===== SERVER =====
app.listen(3000, () => {
  console.log("🚀 Expense bot running on port 3000");
});
