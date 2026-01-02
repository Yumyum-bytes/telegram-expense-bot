// ================= BASIC SETUP =================
const express = require("express");
const fetch = require("node-fetch");
const admin = require("firebase-admin");

const app = express();
app.use(express.json());

// ================= CONFIG =================
const TELEGRAM_BOT_TOKEN = "8088383322:AAHHYOfU4ypz8J2YjiYcmbFwBKb0yo_JpR4";
const AUTHORIZED_USER_ID = "6490673670";
const GEMINI_API_KEY = "AIzaSyDpMf7JalWqAGueuU-efKuDMPrPSyIeszw";

// =================================================
// 🔥🔥🔥 FIREBASE SERVICE ACCOUNT JSON (FULL PASTE)
// 👇👇👇 YAHAN POORI JSON FILE PASTE KARO 👇👇👇
const serviceAccount = {
  {
  "type": "service_account",
  "project_id": "expense-assistant-40ca3",
  "private_key_id": "65e3c5e86516665d850eaceef8175b79f637d4b3",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCmvYqyp6yn1NeG\nD8vPq7NZcRm50WDviKsroj0UlguWr7XJ2AX0tNPqqLDM5czPONHbfRmba8870I/v\n3JHvJtkxX/MQd7tIFa/fqd8GyRcja8Qyr198fb11CIbWQCP8d7G2mZ9e7e8dbxML\nfltOfSV/8v0omSHsgnFKjQWAgxJZEY6KmBloAL9YCua4dVPOUqZKFpE0uBmP5i5J\nK9/jpzAvtHmEvH2JvIaGrF6kh3uu0P2axQtIy1UozoJ+UCX7s1gcXSDT8aNGx9JI\nTKUY7cl2E676ChhudEeRt5RUfnQa0tZyrj6CCmxGwgGaeeBQZzzdVW0L1Sm1EXie\niVfwwORNAgMBAAECggEAH3uX4eI/eyP4uscmQjSnBUsR4rA6R5gMS82TD11CXGYa\nYr1faIQxJDRMR6/XI0RU+YauLFanlyFq4A0LX/a7mTNG83PMAJEZt1c9dWxIKme5\ncKGE275pJJ0iynbrZIrcGwB4I0Y1OR9FHw0xY8lE6JsCemUpjtzVU9B7Orfk4byd\nGGBRgzMxOSV/vGEcAMo+EMvsUW2y8y2dpPsiMxUfha0xxK/CENqJ/qvQy6+4SXmZ\nfSA+GK0b8oISV/hnWbQgYB2vAvg8EBFiMKdncwA0xeau2H5N/lImGw+yPqtRBJI5\napwdY2Xvy1GXbx4cteWPfZeLnOlAWj5OVdNViwiTKQKBgQDVPq+ethCU0pdF0BCQ\n3HokzWmrCNTXtw+ZxF9NWKEL3mK/sxHIPJxPGO2aQlHcoOw5v8dAeK/+B6jQUFoz\ncgVC//aiwtI5W17gdAFCb2EjNNIDfVfABLHMV0ffFY5jQ2rM43GaOCrNJ6qIOEDl\nvv/ZEKy940Gz42bcRVCkqpTuxQKBgQDIK+Z0Qrw5mI7HaoPGgqRZT1PHCKEv4cYs\nR5ZpkNX6TeFqlgHE2ev/ZqHkcev43iMuj2MTobGkZa5ylAU9WVkNeihfrECvS81c\nBUgxLvbCIUNkaM6dr0jLm4ztxhTm/IwCUnWvIlD3wnUznncmb9zhSQeuCX1gGLoU\nIpyXJr536QKBgQDJoqGLEBqzrkFNyQSxBVkVjYn6KLqhUr6UpkN7Lm/xehGjtF3/\nGZivjiG1eDpRxXQ40udERhobuQBeIWx5MrpY9REwK8l+ZLBcyjQarpiKIrrmg9HC\nhm3cizcxcP+XSrslC3dy3ONT48rzTUXIOAdSJ9s/HjEVONQdOgmb+pQjBQKBgGUX\nlrmcgobr/x/DMW3tyKa6I2tfdlhCQ91VAieqWAajknZL7/TEwiUoZhaDWlNDjK0V\nCUp+3MJT//gpvUOwfgMKcJ1w1vIw7DPPDxiXyVNdjTWGoOKOBcuecVwcL65AWU1K\n69hZEl8uPBanrzEgSYMVaOWCMWl403Eb0c2caZERAoGBAIkIC8gwYpd7/TjiKBAw\nZT/Figo30ptUtdH2UVMQ/B5WwwA/9oBYpWO9NISF3yurUV3Xq/3RAv+CJcFNU2i2\nI+/GlDLDSSgLszk66lnL3TfbR99ObCY/rxNRM2tbwaEtlfKQ6vI8HNet15L6xZO5\nfoEnZRRET8A2l3h2sNUpLIUL\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@expense-assistant-40ca3.iam.gserviceaccount.com",
  "client_id": "108054331486148756800",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40expense-assistant-40ca3.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}

};
// =================================================

// Firebase init
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ================= TELEGRAM SEND MESSAGE =================
async function sendMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
    }),
  });
}

// ================= GEMINI 2.5 AI PARSER =================
async function parseExpenseWithGemini(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `
Extract expense details from this message:
"${text}"

Return ONLY JSON like this:
{
  "type": "Debit",
  "amount": number,
  "category": "string",
  "note": "string",
  "date": "YYYY-MM-DD or Today"
}
`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!json.candidates) return null;

    let aiText = json.candidates[0].content.parts[0].text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(aiText);
  } catch (err) {
    console.log("Gemini error:", err);
    return null;
  }
}

// ================= SAVE TO FIREBASE =================
async function saveExpense(data) {
  await db.collection("expenses").add({
    ...data,
    createdAt: new Date(),
    source: "telegram",
  });
}

// ================= TELEGRAM WEBHOOK =================
app.post("/", async (req, res) => {
  res.send("OK"); // Telegram ko turant response

  try {
    const message = req.body.message;
    if (!message) return;

    const chatId = message.chat.id.toString();
    if (chatId !== AUTHORIZED_USER_ID) return;

    const text = message.text || "";
    if (!text) return;

    if (text === "/start") {
      await sendMessage(chatId, "👋 Expense bot ready!\nExample: Chai 20");
      return;
    }

    if (!/\d/.test(text)) {
      await sendMessage(chatId, "❌ Amount missing\nExample: Chai 20");
      return;
    }

    const expense = await parseExpenseWithGemini(text);
    if (!expense || !expense.amount) {
      await sendMessage(chatId, "❌ Samajh nahi aaya\nTry: Chai 20");
      return;
    }

    await saveExpense(expense);

    await sendMessage(
      chatId,
      `✅ Saved\n₹${expense.amount} | ${expense.category}`
    );
  } catch (err) {
    console.log("Webhook error:", err);
  }
});

// ================= SERVER START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Bot running on port", PORT);
});
