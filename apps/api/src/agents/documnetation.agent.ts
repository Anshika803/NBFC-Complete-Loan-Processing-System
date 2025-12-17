import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getDocumentFromDB } from "../services/verification.service";
const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!, // from AI Studio
  model: "gemini-flash-latest",
  temperature: 0.2,
  maxRetries: 0, 
});
//we are getting three types
const REQUIRED_DOCS = [
  { type: "PAN", label: "PAN card" },
  { type: "AADHAAR", label: "Aadhaar card" },
  { type: "SALARY_SLIP", label: "latest salary slip" },
];
export async function documentationAgent(loanId: number): Promise<string> {
  for (const doc of REQUIRED_DOCS) {
    const exists = await getDocumentFromDB(loanId, doc.type);

    if (!exists) {
      const prompt = `
      You are an NBFC documentation assistant.
      
      IMPORTANT RULES:
      - Ask for ONLY ONE document.
      - Do NOT mention any other documents.
      - Do NOT list multiple documents.
      - Do NOT talk about future steps.
      
      Ask the user to upload ONLY their ${doc.label}.
      Explain briefly how to upload it in chat.
      Keep the message short (1–2 sentences).
      `;      

      try {
        const res = await model.invoke(prompt);
        return res.content as string;
      } catch {
        return `Please upload your ${doc.label}.`;
      }
    }
  }
  return "ALL_DOCUMENTS_RECEIVED";
}





























// export async function documentationAgent(message: string): Promise<string> {
//   const prompt = `
// You are the DOCUMENTATION AGENT.

// Your responsibilities:
// - Ask user to upload required documents:
//   1. PAN image (optional)
//   2. Aadhaar image (optional)
//   3. Salary slip (mandatory)
//   4. Bank Statement (optional)

// - Explain how to upload if needed.
// - Confirm when upload is completed.
// - Once ALL required documents are uploaded, reply EXACTLY:
//   "READY_FOR_UNDERWRITING"

// User message: ${message}
// `;

// try{
//   const res = await model.invoke(prompt);
//   return res.content as string;
// }catch{
//   return "Document service is temporarily unavailable.";
// }

// }
