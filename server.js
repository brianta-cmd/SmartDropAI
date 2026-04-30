const express = require("express");
const axios = require("axios");
const fs = require("fs");

const app = express();
app.use(express.json()); // Meta sends JSON, not urlencoded like Twilio

// IMPORTANT HACKATHON KEYS
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "smartdrop_hackathon"; 
let META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || "";
let META_PHONE_ID = process.env.META_PHONE_ID || "1090063544188400"; // TACA2WORLD Real Number

// Load dummy data
let dummyData = [];
try {
  const data = fs.readFileSync("./water_reports.json", "utf8");
  dummyData = JSON.parse(data);
} catch (e) {
  console.log("Mock data not found. Using empty array.");
}

// In-memory Database for Hackathon Prototype
const users = {}; 

// Helper function to send WhatsApp messages via Meta API
async function sendMessage(to, text) {
  if (META_ACCESS_TOKEN === "PASTE_YOUR_META_TOKEN_HERE") {
    console.log("⚠️ Meta Token missing. Would have sent:", text);
    return;
  }
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${META_PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: text }
      },
      { headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` } }
    );
  } catch (err) {
    console.error("Meta API Send Error:", err.response ? err.response.data : err.message);
  }
}

// 1. Meta Webhook Verification Endpoint
app.get("/whatsapp", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verified by Meta!");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// 2. Main Webhook Endpoint (Receiving Messages)
app.post("/whatsapp", async (req, res) => {
  // Always return 200 OK immediately to Meta so they don't retry
  res.sendStatus(200);
  
  console.log("RAW PAYLOAD RECEIVED:");
  console.log(JSON.stringify(req.body, null, 2));

  if (req.body.object) {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {
      const msg = req.body.entry[0].changes[0].value.messages[0];
      const from = msg.from; // Phone number
      const userMessage = msg.text ? msg.text.body.trim() : "";
      
      console.log(`📨 Received from ${from}: ${userMessage}`);

      // Initialize user state if new
      if (!users[from]) {
        users[from] = { step: "NEW", language: "EN", name: "", location: "" };
      }
      const user = users[from];

      // --- CONVERSATION STATE MACHINE ---
      
      // Step 1 & 9: Greeting / Return
      if (["hi", "hello", "hie"].includes(userMessage.toLowerCase())) {
        if (user.step === "MAIN_MENU" || user.step === "AWAITING_MENU_CHOICE") {
           // Returning user
           const greeting = user.language === "EN" 
             ? `Welcome back ${user.name} 👋\n${user.location} water assistant ready.\n\nWhat do you want to check today?\n\n💧 SmartDrop Menu\n1️⃣ Will water come today?\n2️⃣ Report water status\n3️⃣ Community water map\n4️⃣ Change location\n5️⃣ Help`
             : `Mawuya zvekare ${user.name} 👋\nSmartDrop ye ${user.location} yagadzirira.\n\nMunoda kuita chii nhasi?\n\n💧 SmartDrop Menu\n1️⃣ Mvura ichauya nhasi here?\n2️⃣ Taura mamiriro emvura\n3️⃣ Mamiriro enharaunda\n4️⃣ Chinja nzvimbo\n5️⃣ Rubatsiro`;
           await sendMessage(from, greeting);
           user.step = "AWAITING_MENU_CHOICE";
           return;
        } else {
           // New User
           await sendMessage(from, `💧 Welcome to SmartDrop AI\n\nI help you know when water will come and allow your community to report water status.\n\nPlease choose your language:\n1️⃣ English\n2️⃣ Shona`);
           user.step = "AWAITING_LANGUAGE";
           return;
        }
      }

      // Step 2: Language Selection
      if (user.step === "AWAITING_LANGUAGE") {
        if (userMessage === "1") {
          user.language = "EN";
          await sendMessage(from, `Great 👍\nLet’s set up your water assistant.\n\nWhat is your name?`);
        } else if (userMessage === "2") {
          user.language = "SH";
          await sendMessage(from, `Zvakanaka 👍\nNgatigadzirise SmartDrop AI yako.\n\nZita renyu ndiani?`);
        } else {
          await sendMessage(from, `Please choose 1 or 2.`);
          return;
        }
        user.step = "AWAITING_NAME";
        return;
      }

      // Step 3: Capture Name
      if (user.step === "AWAITING_NAME") {
        user.name = userMessage;
        if (user.language === "EN") {
          await sendMessage(from, `Nice to meet you ${user.name} 👋\n\nWhich suburb do you live in?\nExample: Budiriro, Glen Norah, Kuwadzana`);
        } else {
          await sendMessage(from, `Ndinofara kusangana nemi ${user.name} 👋\n\nMunogara kupi?\nSemuyenzaniso: Budiriro, Glen Norah, Kuwadzana`);
        }
        user.step = "AWAITING_LOCATION";
        return;
      }

      // Step 4 & 5: Capture Location & Main Menu
      if (user.step === "AWAITING_LOCATION") {
        user.location = userMessage;
        const menu = user.language === "EN"
          ? `✅ Registered!\nYou will now receive water updates for ${user.location}.\n\nWhat would you like to do?\n\n💧 SmartDrop Menu\n1️⃣ Will water come today?\n2️⃣ Report water status\n3️⃣ Community water map\n4️⃣ Change location\n5️⃣ Help`
          : `✅ Manyoreswa!\nMuchawana mashoko emvura e${user.location}.\n\nMunoda kuita chii?\n\n💧 SmartDrop Menu\n1️⃣ Mvura ichauya nhasi here?\n2️⃣ Taura mamiriro emvura\n3️⃣ Mamiriro enharaunda\n4️⃣ Chinja nzvimbo\n5️⃣ Rubatsiro`;
        await sendMessage(from, menu);
        user.step = "AWAITING_MENU_CHOICE";
        return;
      }

      // Step 6: Menu Choices
      if (user.step === "AWAITING_MENU_CHOICE") {
        if (userMessage === "1") {
          // Gemini Prediction Logic
          const analyzingMsg = user.language === "EN" ? "🤖 Checking community reports..." : "🤖 Ndiri kutarisa mashoko evanhu...";
          await sendMessage(from, analyzingMsg);

          const recentData = JSON.stringify(dummyData.slice(0, 15), null, 2);
          const prompt = `You are the SmartDrop AI assistant. Using the following local water data: 
${recentData}

Provide a concise prediction in ${user.language === "EN" ? "English" : "Shona"} about water availability for the next 48 hours in ${user.location}. 
Be empathetic but factual.

After your prediction, always ask exactly this:
Would you like to report if water comes?
Reply:
1️⃣ Water came
2️⃣ Low pressure
3️⃣ No water`;
          try {
            const response = await axios.post(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_KEY}`,
              { contents: [{ parts: [{ text: prompt }] }] }
            );
            const aiReply = response.data.candidates[0].content.parts[0].text;
            await sendMessage(from, aiReply);
            user.step = "AWAITING_REPORT";
          } catch (err) {
            await sendMessage(from, "Sorry, AI is offline.");
          }
        } 
        else if (userMessage === "4") {
           // Change location
           const msg = user.language === "EN" ? "Which suburb do you live in?" : "Munogara kupi?";
           await sendMessage(from, msg);
           user.step = "AWAITING_LOCATION";
        }
        else {
           const msg = user.language === "EN" ? "Menu option coming soon!" : "Izvi zvichauya munguva pfupi!";
           await sendMessage(from, msg);
        }
        return;
      }

      // Step 7 & 8: Community Reporting
      if (user.step === "AWAITING_REPORT") {
        let status = "Unknown";
        if (userMessage === "1") status = "Water came";
        if (userMessage === "2") status = "Low pressure";
        if (userMessage === "3") status = "No water";

        console.log(`🔥 FIRESTORE SAVE SIMULATION: ${user.name} reported ${status} in ${user.location}`);
        
        const thanks = user.language === "EN"
          ? `✅ Thank you!\nYour report helps SmartDrop AI learn and improve water predictions for everyone.`
          : `✅ Tatenda!\nMashoko enyu anobatsira SmartDrop AI kudzidza nekuvandudza mashoko emvura.`;
        await sendMessage(from, thanks);
        user.step = "AWAITING_MENU_CHOICE";
        return;
      }
    }
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 SmartDrop AI (Cloud Run Version) running on port ${PORT}`);
});
