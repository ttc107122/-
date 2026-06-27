import { APIConfig, ChatMessage, Contact } from "../types";

export async function fetchAIChatResponse(
  messages: { role: "user" | "assistant"; content: string }[],
  contact: Contact,
  userPersona: string,
  apiConfig: APIConfig,
  groupName?: string,
  groupMembers?: { name: string; persona: string }[]
): Promise<string> {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        contactName: contact.name,
        contactPersona: contact.persona,
        contactSignature: contact.signature,
        userPersona,
        groupName,
        groupMembers,
        apiConfig
      })
    });

    if (!response.ok) {
      throw new Error("Failed to fetch chat response from server");
    }

    const data = await response.json();
    return data.text;
  } catch (err: any) {
    console.error("fetchAIChatResponse error:", err);
    return `[AI連線失敗]: ${err.message || err}`;
  }
}

export async function fetchAIMomentUpdate(
  contact: Contact,
  apiConfig: APIConfig
): Promise<string> {
  try {
    const response = await fetch("/api/generate-moment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactName: contact.name,
        contactPersona: contact.persona,
        contactSignature: contact.signature,
        apiConfig
      })
    });

    if (!response.ok) {
      throw new Error("Failed to fetch moment status");
    }

    const data = await response.json();
    return data.text;
  } catch (err: any) {
    console.error("fetchAIMomentUpdate error:", err);
    return `今日ものんびり過ごしています。✨`;
  }
}

export async function fetchAIMomentsReactions(
  userPostContent: string,
  userPersona: string,
  contacts: Contact[],
  apiConfig: APIConfig
): Promise<{ contactName: string; like: boolean; comment: string; delaySec: number }[]> {
  try {
    const response = await fetch("/api/respond-moment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userPostContent,
        userPersona,
        contacts: contacts.map(c => ({ name: c.name, persona: c.persona })),
        apiConfig
      })
    });

    if (!response.ok) {
      throw new Error("Failed to fetch moment reactions");
    }

    const data = await response.json();
    return data.reactions || [];
  } catch (err) {
    console.error("fetchAIMomentsReactions error:", err);
    return [];
  }
}
