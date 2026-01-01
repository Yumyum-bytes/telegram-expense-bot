import express from "express";
import axios from "axios";
import admin from "firebase-admin";

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const GEMINI_KEY = process.env.GEMINI_KEY;
const PORT = process.env.PORT || 3000;

const serviceAccount = JSON.parse(process.env.FIREBASE_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

app.post("/webhook", async (req, res) => {
  res.send("OK");

  const msg = req.body.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text;

  try {
    const ai = await callGemini(text);

    await db.collection("expenses").add({
      ...ai,
      rawText: text,
      source: "telegram",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await sendTelegram(chatId, `✅ Saved ₹${ai.amount} (${ai.category})`);
  } catch {
    await sendTelegram(chatId, "❌ Expense samajh nahi aaya");
  }
});

async function callGemini(text) {
  const prompt = `Extract JSON only: amount(number), category, note. Text: "${text}"`;

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
    { contents: [{ parts: [{ text: prompt }] }] }
  );

  const raw = res.data.candidates[0].content.parts[0].text;
  return JSON.parse(raw.replace(/```json|```/g, ""));
}

async function sendTelegram(chatId, text) {
  await axios.post(
    `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
    { chat_id: chatId, text }
  );
}

app.listen(PORT, () => console.log("Server running"));