import { ChatGoogle } from "@langchain/google-gauth";
import { getLoanWithDetails, updateLoanFields } from "../services/loan.service";

const model = new ChatGoogle({
  model: "gemma-3-27b-it",
  temperature: 0.2,
});

export async function salesAgent(message: string, loanId: number): Promise<string> {

  const loan = await getLoanWithDetails(loanId);
  const user = loan.user;

  const prompt = `
You are the SALES AGENT.

Current State:
- Name: ${user?.name ?? "MISSING"}
- PAN: ${user?.pan_number ?? "MISSING"}
- Aadhaar Last4: ${user?.aadhaar_last_4 ?? "MISSING"}
- Monthly Income: ${loan.monthlyincome?? "MISSING"}
- Loan Amount: ${loan.amount ?? "MISSING"}
- Tenure: ${loan.tenure_months ?? "MISSING"}

Rules:
- Ask ONLY for missing fields.
- When ALL fields are collected, reply EXACTLY:
  READY_FOR_VERIFICATION

User: ${message}
`;

  const res = await model.invoke(prompt);
  const reply = res.content as string;

  const updates: any = {};

  // loan-specific fields
  const income = message.match(/\b\d{5,7}\b/)?.[0];
  if (income) updates.monthly_income = Number(income);

  const amount = message.match(/\b\d{4,7}\b/)?.[0];
  if (amount) updates.amount = Number(amount);

  const tenure = message.match(/(\d+)\s*(months|month)/i)?.[1];
  if (tenure) updates.tenure_months = Number(tenure);

  if (Object.keys(updates).length > 0) {
    await updateLoanFields(loanId, updates);
  }

  const ready =
    user?.name &&
    user?.pan_number &&
    user?.aadhaar_last_4 &&
    loan.monthlyincome &&
    loan.amount &&
    loan.tenure_months;

  if (ready) return "READY_FOR_VERIFICATION";

  return reply;
}
