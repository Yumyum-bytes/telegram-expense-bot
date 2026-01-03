import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config();

const app = express();
app.use(express.json());

/* ---------------- FIREBASE ---------------- */
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

const db = admin.firestore();

/* ---------------- TELEGRAM ---------------- */
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

/* ---------------- GROQ ---------------- */
async function parseExpense(text) {
  const prompt = `
Extract expense info from this text.
Return JSON ONLY.

Fields:
amount (number)
type (expense/income)
mode (cash | office_phonepe | naveen_phonepe)
category
description

Text: "${text}"
`;

  const res = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return JSON.parse(res.data.choices[0].message.content);
}

/* ---------------- WEBHOOK ---------------- */
app.post("/webhook", async (req, res) => {
  res.send("OK");

  const msg = req.body.message;
  if (!msg || !msg.text) return;

  try {
    const expense = await parseExpense(msg.text);

    await db.collection("ledger").add({
      ...expense,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      date: new Date().toISOString().slice(0, 10),
    });

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: msg.chat.id,
      text: `✅ Saved\n₹${expense.amount} | ${expense.mode}`,
    });
  } catch (err) {
    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: msg.chat.id,
      text: "❌ Samajh nahi aaya, thoda clear likho",
    });
  }
});

app.listen(3000, () => console.log("Bot running"));
