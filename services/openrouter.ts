// services/openrouter.ts
import axios from 'axios';

export async function askLLM(prompt: string): Promise<string> {
  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("Missing OpenRouter API Key");

    const res = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful AI agent for a user who wants to automate daily life." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    }, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Personal AI Agent"
      }
    });

    if (!res.data.choices || !res.data.choices[0] || !res.data.choices[0].message) {
      throw new Error("Invalid response format from OpenRouter API");
    }

    return res.data.choices[0].message.content;
  } catch (error) {
    console.error("OpenRouter service error:", error);
    if (axios.isAxiosError(error)) {
      const errorMsg = error.response?.data || error.message;
      throw new Error(`OpenRouter API error: ${errorMsg}`);
    }
    throw error;
  }
}
