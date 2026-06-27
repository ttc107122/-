import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Google GenAI if key is present
const geminiApiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (geminiApiKey) {
  ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper to make API calls to Custom OpenAI/Groq or Gemini fallback
async function executeAICall(
  systemInstruction: string,
  userPrompt: string,
  chatHistory: { role: "user" | "assistant"; content: string }[],
  apiConfig?: { url?: string; model?: string; apiKey?: string }
): Promise<string> {
  const hasCustomKey = apiConfig && apiConfig.apiKey && apiConfig.apiKey.trim().length > 0;
  
  if (hasCustomKey) {
    // Call user's custom API (e.g. Groq / OpenAI)
    const targetUrl = apiConfig.url && apiConfig.url.trim().length > 0
      ? apiConfig.url.trim()
      : "https://api.groq.com/openai/v1/chat/completions";
    
    const targetModel = apiConfig.model && apiConfig.model.trim().length > 0
      ? apiConfig.model.trim()
      : "llama-3.3-70b-versatile";

    // Format messages for OpenAI format
    const messages = [
      { role: "system", content: systemInstruction },
      ...chatHistory.map(msg => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content
      }))
    ];

    if (userPrompt) {
      messages.push({ role: "user", content: userPrompt });
    }

    try {
      const response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiConfig.apiKey}`
        },
        body: JSON.stringify({
          model: targetModel,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Custom API returned error status ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (content) {
        return content.trim();
      }
      throw new Error("Invalid response format from custom API provider");
    } catch (e: any) {
      console.error("Custom API call failed, attempting fallback to server Gemini if available:", e.message);
      // Fallback to Gemini if custom API fails and Gemini is initialized
    }
  }

  // Fallback / Default: Gemini API call
  if (!ai) {
    return "API configuration is missing. Please configure your Groq/OpenAI API settings in Settings -> API Settings, or ensure the server has a GEMINI_API_KEY.";
  }

  try {
    // Format the entire context for Gemini Flash
    let fullPrompt = `System Rules & Persona:\n${systemInstruction}\n\n`;
    if (chatHistory.length > 0) {
      fullPrompt += `--- Conversation History ---\n`;
      chatHistory.forEach(msg => {
        const speaker = msg.role === "assistant" ? "AI" : "User";
        fullPrompt += `${speaker}: ${msg.content}\n`;
      });
      fullPrompt += `-------------------------\n\n`;
    }
    if (userPrompt) {
      fullPrompt += `User: ${userPrompt}\n`;
    }
    fullPrompt += `AI: [Respond strictly in character, stay brief and human-like, like a real WeChat user. Avoid any assistant prefix or markdown headers]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: fullPrompt,
    });

    if (response && response.text) {
      return response.text.trim();
    }
    return "[無回應]";
  } catch (error: any) {
    console.error("Gemini API call failed:", error);
    return `[AI系統出錯]: ${error.message}`;
  }
}

// API Routes

// 1. Chat Response Route
app.post("/api/chat", async (req, res) => {
  const {
    messages = [],
    contactName,
    contactPersona,
    contactSignature,
    userPersona = "",
    groupName,
    groupMembers = [],
    apiConfig
  } = req.body;

  try {
    let systemInstruction = "";
    let userPrompt = "";

    if (groupName) {
      // Group chat context
      systemInstruction = `
You are playing the role of multiple AI characters in a WeChat group chat named "${groupName}".
The group members are:
- User (Your Friend/Contact)
${groupMembers.map((m: any) => `- ${m.name}: ${m.persona}`).join("\n")}

You should generate a reply from ONE of the AI members who would most naturally respond next to keep the conversation going, or a member tagged in the conversation.
Current active member replying is: ${contactName}.
Persona for ${contactName}: ${contactPersona}
WeChat Signature for ${contactName}: ${contactSignature}

My (the User's) profile and persona is: ${userPersona}

Respond naturally as "${contactName}". Begin your response strictly with their text message content directly. DO NOT output the name prefix like "${contactName}:" or use quotes. Keep the text brief, authentic, and styled like standard mobile chat software messaging.
`;
    } else {
      // Single chat context
      systemInstruction = `
You are playing the role of "${contactName}" in a private WeChat-like chat with the user.
Your Character Profile / Persona (角色設定):
${contactPersona}

Your WeChat Signature (個簽):
${contactSignature}

My (the User's) Profile / Persona (用戶設定，面對AI的人設):
${userPersona}

Roleplay Guidelines:
1. Stay strictly in character as "${contactName}". Speak from their perspective.
2. WeChat messages are short, casual, and highly personal. Do not sound like an AI assistant. Use emojis, brief replies, and human-like phrasing.
3. Be conversational and responsive.
4. Keep the reply short (usually 1-3 sentences) unless asked for something long.
`;
    }

    // Standard history mapping
    const chatHistory = messages.slice(0, -1);
    const lastMsg = messages[messages.length - 1];
    if (lastMsg) {
      userPrompt = lastMsg.content;
    }

    const aiResponseText = await executeAICall(
      systemInstruction,
      userPrompt,
      chatHistory,
      apiConfig
    );

    res.json({ text: aiResponseText });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Generate Moment Update (最新情報)
app.post("/api/generate-moment", async (req, res) => {
  const { contactName, contactPersona, contactSignature, apiConfig } = req.body;

  const systemInstruction = `
You are "${contactName}". You are updating your WeChat Moments Status (最新情報/動態).
Your Character Persona:
${contactPersona}

Your WeChat Signature:
${contactSignature}

Generate a short status update (1 or 2 sentences max) that you would post to your Moments. It must be highly authentic to your character's current mood, hobbies, or personality. Speak in first-person as "${contactName}". Keep it incredibly natural, brief, and interesting. Do not include quotes, hashtags or markdown.
`;

  try {
    const statusText = await executeAICall(
      systemInstruction,
      "Generate a single Moments post reflecting your current life, thoughts, or feeling.",
      [],
      apiConfig
    );
    res.json({ text: statusText });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Generate Reactions & Replies to User's Moment Post
app.post("/api/respond-moment", async (req, res) => {
  const { userPostContent, userPersona = "", contacts = [], apiConfig } = req.body;

  try {
    const responses = [];

    // Evaluate each contact to decide if they like and what comment they will post
    for (const contact of contacts) {
      const systemInstruction = `
You are playing the role of "${contact.name}". Your persona:
${contact.persona}

The User (whose persona is: "${userPersona}") just posted a Moments update on WeChat:
"${userPostContent}"

Decide how you react based on your persona.
You must output a JSON format strictly matching this structure:
{
  "like": true or false,
  "comment": "your natural, short comment here, or leave empty string if you wouldn't comment",
  "shouldRespond": true or false
}

Rules:
1. Make the comment highly authentic, short (1 sentence), casual, and specific to your character design.
2. If your character doesn't like or comment (e.g. they are indifferent, cold, or hostile), set "like" to false, "comment" to "", and "shouldRespond" to false.
3. Be playful and human-like.
4. Output ONLY valid JSON.
`;

      const aiResponseText = await executeAICall(
        systemInstruction,
        "Analyze the user's post and respond in the requested JSON format.",
        [],
        apiConfig
      );

      try {
        // Find JSON block if AI added wrap
        const cleanJson = aiResponseText.substring(
          aiResponseText.indexOf("{"),
          aiResponseText.lastIndexOf("}") + 1
        );
        const parsed = JSON.parse(cleanJson);
        if (parsed.shouldRespond || parsed.like || parsed.comment) {
          responses.push({
            contactName: contact.name,
            like: !!parsed.like,
            comment: parsed.comment || "",
            // Random delay between 1 to 10 seconds to make it look realistic
            delaySec: Math.floor(Math.random() * 8) + 2
          });
        }
      } catch (e) {
        // Fallback if parsing fails or AI outputs non-JSON
        if (aiResponseText && !aiResponseText.startsWith("[")) {
          responses.push({
            contactName: contact.name,
            like: Math.random() > 0.5,
            comment: aiResponseText.slice(0, 100),
            delaySec: Math.floor(Math.random() * 8) + 2
          });
        }
      }
    }

    res.json({ reactions: responses });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend assets in production / dev setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
