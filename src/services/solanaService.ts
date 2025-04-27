// src/services/solanaService.ts
import { Connection, SystemProgram, PublicKey, ParsedTransactionWithMeta } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getConfig } from "../config";

const config = getConfig();

export const verifySolPaymentWithAmount = async (
  signature: string,
  senderWallet: string,
  requiredLamports: number
): Promise<boolean> => {
  try {
    console.log("Verifying SOL payment with SOLANA_RPC_URL:", config.SOLANA_RPC_URL);
    console.log("Transaction signature:", signature);
    console.log("Sender wallet:", senderWallet);
    console.log("Required amount (lamports):", requiredLamports);

    const connection = new Connection(config.SOLANA_RPC_URL, "confirmed");
    const transaction = await connection.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: undefined,
    });

    if (!transaction || !transaction.meta) {
      console.log("Transaction not found or not confirmed yet:", transaction);
      return false;
    }

    console.log(
      "Transaction instructions:",
      JSON.stringify(transaction.transaction.message.instructions, null, 2)
    );

    const transferInstruction = transaction.transaction.message.instructions.find(
      (ix: any) =>
        ix.programId.toString() === SystemProgram.programId.toString() &&
        ix.parsed?.type === "transfer" &&
        ix.parsed.info.source === senderWallet &&
        ix.parsed.info.destination === config.WEBSITE_WALLET &&
        ix.parsed.info.lamports === requiredLamports
    );

    if (!transferInstruction) {
      console.log("No valid SOL transfer found in transaction. Expected conditions not met.");
      return false;
    }

    console.log(
      "SOL payment verified successfully:",
      JSON.stringify(transferInstruction, null, 2)
    );
    return true;
  } catch (error) {
    console.error("Error verifying SOL payment:", error);
    return false;
  }
};

export const verifyUsdcPaymentWithAmount = async (
  signature: string,
  senderWallet: string,
  requiredAmount: number // Amount in USDC (6 decimals)
): Promise<boolean> => {
  try {
    console.log("Verifying USDC payment with SOLANA_RPC_URL:", config.SOLANA_RPC_URL);
    console.log("Transaction signature:", signature);
    console.log("Sender wallet:", senderWallet);
    console.log("Required amount (USDC, 6 decimals):", requiredAmount);

    const connection = new Connection(config.SOLANA_RPC_URL, "confirmed");
    const transaction: ParsedTransactionWithMeta | null = await connection.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: undefined,
    });

    if (!transaction || !transaction.meta) {
      console.log("Transaction not found or not confirmed yet:", transaction);
      return false;
    }

    console.log(
      "Transaction instructions:",
      JSON.stringify(transaction.transaction.message.instructions, null, 2)
    );

    const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // Mainnet USDC
    const receiverPublicKey = new PublicKey(config.WEBSITE_WALLET);

    const transferInstruction = transaction.transaction.message.instructions.find(
      (ix: any) =>
        ix.programId.toString() === TOKEN_PROGRAM_ID.toString() &&
        ix.parsed?.type === "transfer" &&
        ix.parsed.info.authority === senderWallet &&
        ix.parsed.info.mint === usdcMint.toString() &&
        ix.parsed.info.destination.includes(receiverPublicKey.toString()) &&
        ix.parsed.info.amount === requiredAmount.toString()
    );

    if (!transferInstruction) {
      console.log("No valid USDC transfer found in transaction. Expected conditions not met.");
      return false;
    }

    console.log(
      "USDC payment verified successfully:",
      JSON.stringify(transferInstruction, null, 2)
    );
    return true;
  } catch (error) {
    console.error("Error verifying USDC payment:", error);
    return false;
  }
};