import {
  createLoan,
  getLoanStatus,
  updateLoanStatus,
  hasActiveLoan,
  approveLoan,
  getLoanWithDetails,
  getUserLoans,
} from "../services/loan.service";

async function testLoanFlow() {
  try {
    console.log("1️⃣ Creating loan...");
    const loan = await createLoan({
      userId: 1,        // must exist in DB
      type: "PERSONAL",
      amount: 50000,
      tenureMonths: 12,
    });
    console.log("Loan created:", loan);

    console.log("2️⃣ Checking active loan...");
    const active = await hasActiveLoan(1);
    console.log("Has active loan:", active);

    console.log("3️⃣ Getting loan status...");
    const status = await getLoanStatus(1);
    console.log("Loan status:", status);

    console.log("4️⃣ Approving loan...");
    await approveLoan(loan.id);

    console.log("5️⃣ Fetch full loan details...");
    const details = await getLoanWithDetails(loan.id);
    console.log("Loan details:", details);

    console.log("6️⃣ Get all user loans...");
    const loans = await getUserLoans(1);
    console.log("User loans:", loans);

  } catch (err) {
    console.error("❌ Error:", err);
  }
}

testLoanFlow();
