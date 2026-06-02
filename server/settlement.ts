export interface SettlementTransaction {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

export interface MemberBalance {
  userId: string;
  name: string;
  netBalance: number; // positive = creditor, negative = debtor
}

/**
 * Greedily resolves who owes whom what amount.
 * 1. For each member, we calculate: PaymentsPaid - TotalOwedAmount across all expense splits.
 * 2. Separate members into creditors (balance > 0.01) and debtors (balance < -0.01).
 * 3. Match debtors and creditors greedily.
 */
export function calculateSettlements(
  members: { id: string; user_id: string; name: string }[],
  expenses: { id: string; paid_by: string; amount: number }[],
  splits: { expense_id: string; user_id: string; amount_owed: number; is_settled: boolean }[]
): SettlementTransaction[] {
  
  // Initialize balances for each user participating in the trip
  const balances: { [userId: string]: { name: string; amount: number } } = {};
  
  members.forEach((m) => {
    balances[m.user_id] = {
      name: m.name,
      amount: 0,
    };
  });

  // 1. Calculate net contributions:
  // For each expense, add PAID amount to paid_by balance
  // For each UNSETTLED split, subtract owed_amount from user_id active balance
  expenses.forEach((exp) => {
    if (balances[exp.paid_by]) {
      balances[exp.paid_by].amount += exp.amount;
    }
  });

  // Standardise splits: Subtract amount_owed from users
  splits.forEach((split) => {
    // Only calculate unsettled splits!
    if (!split.is_settled && balances[split.user_id]) {
      balances[split.user_id].amount -= split.amount_owed;
    }
  });

  // Transform into lists of debtors and creditors
  const debtors: { userId: string; name: string; amount: number }[] = [];
  const creditors: { userId: string; name: string; amount: number }[] = [];

  Object.entries(balances).forEach(([userId, item]) => {
    const rounded = Math.round(item.amount * 100) / 100;
    if (rounded < -0.01) {
      debtors.push({ userId, name: item.name, amount: Math.abs(rounded) });
    } else if (rounded > 0.01) {
      creditors.push({ userId, name: item.name, amount: rounded });
    }
  });

  const transactions: SettlementTransaction[] = [];

  // Sort lists to pair highest debtors and creditors first (Greedy approach)
  debianMatch();

  function debianMatch() {
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];

      if (debtor.amount <= 0.01) {
        dIdx++;
        continue;
      }
      if (creditor.amount <= 0.01) {
        cIdx++;
        continue;
      }

      // Settle the minimum of what debtor owes or creditor receives
      const settleAmount = Math.min(debtor.amount, creditor.amount);
      
      transactions.push({
        from: debtor.userId,
        fromName: debtor.name,
        to: creditor.userId,
        toName: creditor.name,
        amount: Math.round(settleAmount * 100) / 100,
      });

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;

      if (debtor.amount <= 0.01) {
        dIdx++;
      }
      if (creditor.amount <= 0.01) {
        cIdx++;
      }
    }
  }

  return transactions;
}
