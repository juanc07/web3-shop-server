import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, getAccount } from "@solana/spl-token";
import * as bs58 from "bs58";
import * as dotenv from "dotenv";

// Load environment variables if not already loaded by dist/env.js
if (!process.env.WEBSITE_WALLET_PRIVATE_KEY || !process.env.WEBSITE_WALLET) {
  dotenv.config();
}

// Environment variables
const WEBSITE_WALLET_PRIVATE_KEY: string = process.env.WEBSITE_WALLET_PRIVATE_KEY || "";
const WEBSITE_WALLET: string = process.env.WEBSITE_WALLET || "";
const USDC_MINT_ADDRESS: string = process.env.USDC_MINT_ADDRESS || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"; // Devnet USDC
const SOLANA_RPC_URL: string = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

async function createATA(): Promise<void> {
  try {
    // Validate environment variables
    if (!WEBSITE_WALLET_PRIVATE_KEY || !WEBSITE_WALLET) {
      throw new Error("WEBSITE_WALLET_PRIVATE_KEY or WEBSITE_WALLET is not set in .env file.");
    }
    if (!SOLANA_RPC_URL) {
      throw new Error("SOLANA_RPC_URL is not set in .env file.");
    }

    console.log("Environment Variables:", {
      WEBSITE_WALLET_PRIVATE_KEY: WEBSITE_WALLET_PRIVATE_KEY.slice(0, 4) + "...",
      WEBSITE_WALLET,
      USDC_MINT_ADDRESS,
      SOLANA_RPC_URL,
    });

    const connection = new Connection(SOLANA_RPC_URL, "confirmed");

    // Validate and decode private key
    let merchantKeypair: Keypair;
    try {
      merchantKeypair = Keypair.fromSecretKey(bs58.default.decode(WEBSITE_WALLET_PRIVATE_KEY));
    } catch (error) {
      throw new Error("Invalid WEBSITE_WALLET_PRIVATE_KEY. Ensure it’s a valid base58-encoded private key.");
    }

    // Validate public keys
    let usdcMint: PublicKey;
    let merchantPubkey: PublicKey;
    try {
      usdcMint = new PublicKey(USDC_MINT_ADDRESS);
      merchantPubkey = new PublicKey(WEBSITE_WALLET);
    } catch (error) {
      throw new Error("Invalid USDC_MINT_ADDRESS or WEBSITE_WALLET. Ensure they are valid base58 strings.");
    }

    // Verify private key matches public key
    if (merchantKeypair.publicKey.toBase58() !== merchantPubkey.toBase58()) {
      throw new Error("WEBSITE_WALLET_PRIVATE_KEY does not match WEBSITE_WALLET public key.");
    }

    // Check wallet balance
    const balance = await connection.getBalance(merchantPubkey);
    console.log("Merchant Wallet Balance:", balance / 1_000_000_000, "SOL");
    if (balance < 0.01 * 1_000_000_000) {
      throw new Error("Insufficient SOL in merchant wallet for transaction fees. Fund wallet on Devnet: https://faucet.solana.com/");
    }

    // Get or create ATA
    const merchantATA = await getAssociatedTokenAddress(usdcMint, merchantPubkey);
    console.log("Calculated ATA Address:", merchantATA.toBase58());

    // Check if ATA exists
    try {
      const account = await getAccount(connection, merchantATA);
      console.log("ATA exists:", {
        address: merchantATA.toBase58(),
        mint: account.mint.toBase58(),
        owner: account.owner.toBase58(),
      });
      return;
    } catch (error) {
      console.log("ATA does not exist, creating...");
    }

    // Create transaction to initialize ATA
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        merchantKeypair.publicKey, // Payer
        merchantATA, // ATA address
        merchantPubkey, // Owner
        usdcMint // Mint
      )
    );

    // Sign and send transaction
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = merchantKeypair.publicKey;

    console.log("Sending ATA creation transaction...");
    const signature = await connection.sendTransaction(transaction, [merchantKeypair]);
    console.log("Transaction Signature:", signature);

    await connection.confirmTransaction(signature, "confirmed");
    console.log("ATA creation transaction confirmed");

    // Retry ATA check with delay to ensure network sync
    console.log("Verifying ATA creation...");
    for (let i = 0; i < 3; i++) {
      try {
        const account = await getAccount(connection, merchantATA);
        console.log("ATA created successfully:", {
          address: merchantATA.toBase58(),
          mint: account.mint.toBase58(),
          owner: account.owner.toBase58(),
        });
        console.log("Explorer Link: https://explorer.solana.com/address/" + merchantATA.toBase58() + "?cluster=devnet");
        return;
      } catch (error) {
        console.log(`Retry ${i + 1}/3: ATA not yet found, waiting 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error("Failed to verify ATA creation. Check transaction on explorer: https://explorer.solana.com/tx/" + signature + "?cluster=devnet");
  } catch (error: any) {
    console.error("Error creating ATA:", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

createATA().catch((error) => {
  console.error("Failed to create ATA:", error);
  process.exit(1);
});