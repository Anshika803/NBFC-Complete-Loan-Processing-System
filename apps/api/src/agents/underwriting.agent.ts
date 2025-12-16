import { UnderwritingService } from "../services/underwriting.service";
export async function underwritingAgent(
  message: string,
  loanId: number
): Promise<string> {
  const result = await UnderwritingService.processLoanUnderwriting(loanId);

  if (typeof result === "string") {
    // this is "Loan not created yet."
    return result;
  }
  
  // now TypeScript KNOWS result is an object
  if (!result.approved) {
    return `
  Your loan could not be approved.
  Reason: ${result.rejectionReason}
  `;
  }
  
  return `
  Your loan has been approved!
  FOIR: ${(result.foir * 100).toFixed(2)}%
  `;
} 