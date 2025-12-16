import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!, // from AI Studio
  model: "gemini-flash-latest",
  temperature: 0.2,
  maxRetries: 0, 
});

export async function documentationAgent(message: string): Promise<string> {
  const prompt = `
You are the DOCUMENTATION AGENT.

Your responsibilities:
- Ask user to upload required documents:
  1. PAN image (optional)
  2. Aadhaar image (optional)
  3. Salary slip (mandatory)
  4. Bank Statement (optional)

- Explain how to upload if needed.
- Confirm when upload is completed.
- Once ALL required documents are uploaded, reply EXACTLY:
  "READY_FOR_UNDERWRITING"

User message: ${message}
`;

try{
  const res = await model.invoke(prompt);
  return res.content as string;
}catch{
  return "Document service is temporarily unavailable.";
}

}
