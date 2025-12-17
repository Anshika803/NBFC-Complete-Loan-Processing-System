import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  getLoanWithDetails,
  updateLoanFields,
  updateUserName,
} from "../services/loan.service";

const model = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
  model: "gemini-flash-latest",
  temperature: 0.2,
});

export async function salesAgent(
  message: string,
  loanId: number
): Promise<string> {

  const loan = await getLoanWithDetails(loanId);
  if (!loan) {
    throw new Error("Loan not found");
  }
  const user = loan.user;
  const updates: any = {};
  const nameMatch = message.match(/my name is ([a-zA-Z ]+)/i);
  if (nameMatch && !user?.name) {
    await updateUserName(user.id, nameMatch[1].trim());
  }

  if (!loan.monthlyincome) {
    const incomeMatch = message.match(/\b(\d{4,7})\b/);
    if (incomeMatch) updates.monthlyincome = Number(incomeMatch[1]);
  }
  
  if (!loan.amount) {
    const lower = message.toLowerCase();
  
    // handles: "5 lakh", "10 lakhs"
    const lakhMatch = lower.match(/(\d+)\s*lakh/);
    if (lakhMatch) {
      updates.amount = Number(lakhMatch[1]) * 100000;
    } else {
      // handles: "500000", "loan amount is 400000"
      const amountMatch = lower.match(
        /(loan|amount|need|require)[^\d]*(\d{5,8})/
      );
      if (amountMatch) {
        updates.amount = Number(amountMatch[2]);
      }
    }
  }
  
  if (!loan.tenure_months) {
    const tenureMatch = message.match(/(\d+)\s*(months|month)/i);
    if (tenureMatch) updates.tenure_months = Number(tenureMatch[1]);
  }

  if (Object.keys(updates).length > 0) {
    await updateLoanFields(loanId, updates);
  }
  const updatedLoan = await getLoanWithDetails(loanId);
  if (!updatedLoan) {
    throw new Error("Loan not found after update");
  }
  const updatedUser = updatedLoan.user;

  const missing: string[] = [];
  if (!updatedUser?.name) missing.push("your full name");
  if (!updatedLoan.monthlyincome) missing.push("your monthly income");
  if (!updatedLoan.amount) missing.push("loan amount");
  if (!updatedLoan.tenure_months) missing.push("loan tenure in months");
  if (missing.length === 0) {
    return "READY_FOR_VERIFICATION";
  }
  const prompt = `
You are a polite NBFC loan sales agent.
Ask ONLY for: ${missing[0]}.
Ask one short, clear question.
`;

  const res = await model.invoke(prompt);
  return res.content as string;
}
