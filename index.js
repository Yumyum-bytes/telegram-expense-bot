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
  res.send("OK"); // Fast response to Telegram to prevent timeout

  try {
    const message = req.body.message;
    if (!message) return;

    const chatId = message.chat.id.toString();
    // Authorized User Check
    if (chatId !== CONFIG.AUTHORIZED_USER_ID) {
      console.log(`Unauthorized access: ${chatId}`);
      return; 
    }

    const text = message.text;
    if (!text) return;

    // AI se expense extract karein
    const expense = await extractExpenseUsingAI(text);
    
    if (!expense) {
      await sendMessage(chatId, "❌ Samajh nahi aaya. Try: '50rs ke momos khaye'");
      return;
    }

    // Firestore me save karein
    await db.collection("expenses").add({
      ...expense,
      createdAt: new Date(), // Simple date object
    });

    // Success Message
    await sendMessage(
      chatId,
      `✅ *Saved*\n💰 ₹${expense.amount} | ${expense.category}\n📝 ${expense.remarks}`
    );

  } catch (err) {
    console.log("❌ Error:", err.message);
    await sendMessage(CONFIG.AUTHORIZED_USER_ID, `⚠️ Error: ${err.message}`);
  }
});

// ===== GEMINI AI (UPDATED FOR 2.5 FLASH) =====
async function extractExpenseUsingAI(text) {
  // ✅ Apka diya hua naya Model URL (Gemini 2.5 Flash)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

  const todayDate = new Date().toISOString().split('T')[0];

  // AI Ko Role Dena (System Instruction)
  const systemInstruction = {
    parts: [{
      text: `You are an Expense Tracker Bot.
      Current Date: ${todayDate}
      
      Task: Extract expense details from the user's input.
      
      Rules:
      1. Output MUST be valid JSON only. No markdown, no "Here is the json".
      2. If the user input is NOT an expense (e.g. "Hi", "Hello"), return null.
      3. Default currency is INR (₹).
      
      JSON Structure:
      {
        "type": "Debit",
        "amount": number,
        "category": "Food" | "Travel" | "Shopping" | "Bills" | "Other",
        "mode": "Cash" | "Online" | "UPI",
        "remarks": string,
        "date": "YYYY-MM-DD"
      }`
    }]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: systemInstruction, // Role definition
        contents: [{ parts: [{ text: text }] }], // User message
        generationConfig: {
          response_mime_type: "application/json" // ✅ Force JSON response
        }
      }),
    });

    const json = await response.json();

    // Debugging ke liye (Agar error aaye to console me dikhega)
    if (json.error) {
      console.error("⚠️ AI API Error:", JSON.stringify(json.error, null, 2));
      return null;
    }

    if (!json.candidates || !json.candidates[0].content) return null;

    const rawText = json.candidates[0].content.parts[0].text;
    return JSON.parse(rawText);

  } catch (error) {
    console.error("❌ AI Processing Error:", error);
    return null;
  }
}

// ===== TELEGRAM SEND =====
async function sendMessage(chatId, text) {
  await fetch(
    `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        chat_id: chatId, 
        text: text,
        parse_mode: "Markdown" 
      }),
    }
  );
}

// ===== SERVER =====
app.listen(3000, () => {
  console.log("🚀 Expense bot is running...");
});
