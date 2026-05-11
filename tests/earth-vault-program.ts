import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import {
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Ed25519Program,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import nacl from "tweetnacl";
import { EarthVaultProgram } from "../target/types/earth_vault_program";

const PROGRAM_ID = new PublicKey("J3jkrtAqnr7Vs6evka3wdugjdagwUJhGj3Mzae6wdABB");
const CONFIG_SEED = Buffer.from("earth-vault-config");
const CHARACTER_RECEIPT_SEED = Buffer.from("character-mint-receipt");
const PURCHASE_RECEIPT_SEED = Buffer.from("purchase-receipt");
const DEPOSIT_RECEIPT_SEED = Buffer.from("deposit-receipt");
const WITHDRAWAL_RECORD_SEED = Buffer.from("withdrawal-record");
const ONE_EARTH = 1_000_000_000n;

function bytes(value: number): number[] {
  return Array.from(Buffer.alloc(32, value));
}

function u64(value: bigint): anchor.BN {
  return new anchor.BN(value.toString());
}

function i64(value: bigint): anchor.BN {
  return new anchor.BN(value.toString());
}

function withdrawalMessage(player: PublicKey, amount: bigint, withdrawalId: number[], expiry: bigint): Buffer {
  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(amount);
  const expiryBuffer = Buffer.alloc(8);
  expiryBuffer.writeBigInt64LE(expiry);
  return Buffer.concat([
    Buffer.from("earth-vault-withdraw"),
    player.toBuffer(),
    amountBuffer,
    Buffer.from(withdrawalId),
    expiryBuffer,
  ]);
}

async function expectRejected(promise: Promise<unknown>): Promise<void> {
  try {
    await promise;
  } catch {
    return;
  }
  throw new Error("Expected promise to reject");
}

async function airdrop(connection: anchor.web3.Connection, pubkey: PublicKey, sol = 5): Promise<void> {
  const signature = await connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
  const blockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature, ...blockhash }, "confirmed");
}

describe("earth-vault-program", () => {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = anchor.workspace.EarthVaultProgram as Program<EarthVaultProgram>;

  const authority = Keypair.generate();
  const player = Keypair.generate();
  const daoTreasury = Keypair.generate();
  const operationsWallet = Keypair.generate();
  const reserveWallet = Keypair.generate();
  const serverAuthority = Keypair.generate();

  let config: PublicKey;
  let earthMint: PublicKey;
  let earthEscrow: PublicKey;
  let playerEarthAccount: PublicKey;

  before(async () => {
    await Promise.all([
      airdrop(provider.connection, authority.publicKey),
      airdrop(provider.connection, player.publicKey),
    ]);

    [config] = PublicKey.findProgramAddressSync(
      [CONFIG_SEED, authority.publicKey.toBuffer()],
      PROGRAM_ID,
    );

    earthMint = await createMint(
      provider.connection,
      authority,
      config,
      null,
      9,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    earthEscrow = (await getOrCreateAssociatedTokenAccount(
      provider.connection,
      authority,
      earthMint,
      config,
      true,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    )).address;

    playerEarthAccount = await createAssociatedTokenAccount(
      provider.connection,
      authority,
      earthMint,
      player.publicKey,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
  });

  it("initializes config with split math and pause controls", async () => {
    await program.methods
      .initialize({
        serverAuthority: serverAuthority.publicKey,
        splits: { daoBps: 5000, operationsBps: 3000, reserveBps: 2000 },
        characterPriceLamports: u64(1_000_000_000n),
        starterEarthAmount: u64(100n * ONE_EARTH),
        earthPerSol: u64(250n * ONE_EARTH),
      })
      .accountsStrict({
        authority: authority.publicKey,
        config,
        earthMint,
        daoTreasury: daoTreasury.publicKey,
        operationsWallet: operationsWallet.publicKey,
        reserveWallet: reserveWallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const account = await program.account.earthVaultConfig.fetch(config);
    expect(account.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(account.paused.characterPayment).to.equal(false);
  });

  it("creates a character receipt, splits SOL, credits escrow, and prevents receipt replay", async () => {
    const receiptId = bytes(1);
    const [receipt] = PublicKey.findProgramAddressSync(
      [CHARACTER_RECEIPT_SEED, player.publicKey.toBuffer(), Buffer.from(receiptId)],
      PROGRAM_ID,
    );
    const daoBefore = await provider.connection.getBalance(daoTreasury.publicKey);
    const opsBefore = await provider.connection.getBalance(operationsWallet.publicKey);
    const reserveBefore = await provider.connection.getBalance(reserveWallet.publicKey);

    await program.methods
      .characterPayment(receiptId, u64(1_000_000_000n))
      .accountsStrict({
        player: player.publicKey,
        config,
        earthMint,
        earthEscrow,
        daoTreasury: daoTreasury.publicKey,
        operationsWallet: operationsWallet.publicKey,
        reserveWallet: reserveWallet.publicKey,
        receipt,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    expect(await provider.connection.getBalance(daoTreasury.publicKey)).to.equal(daoBefore + 500_000_000);
    expect(await provider.connection.getBalance(operationsWallet.publicKey)).to.equal(opsBefore + 300_000_000);
    expect(await provider.connection.getBalance(reserveWallet.publicKey)).to.equal(reserveBefore + 200_000_000);
    expect((await getAccount(provider.connection, earthEscrow, undefined, TOKEN_2022_PROGRAM_ID)).amount).to.equal(100n * ONE_EARTH);

    await expectRejected(
      program.methods
        .characterPayment(receiptId, u64(1_000_000_000n))
        .accountsStrict({
          player: player.publicKey,
          config,
          earthMint,
          earthEscrow,
          daoTreasury: daoTreasury.publicKey,
          operationsWallet: operationsWallet.publicKey,
          reserveWallet: reserveWallet.publicKey,
          receipt,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc(),
    );
  });

  it("enforces pause flags", async () => {
    await program.methods
      .setPauseFlags({ characterPayment: true, buyEarth: false, deposit: false, withdraw: false })
      .accountsStrict({ authority: authority.publicKey, config })
      .signers([authority])
      .rpc();

    const receiptId = bytes(2);
    const [receipt] = PublicKey.findProgramAddressSync(
      [CHARACTER_RECEIPT_SEED, player.publicKey.toBuffer(), Buffer.from(receiptId)],
      PROGRAM_ID,
    );

    await expectRejected(
      program.methods
        .characterPayment(receiptId, u64(1_000_000_000n))
        .accountsStrict({
          player: player.publicKey,
          config,
          earthMint,
          earthEscrow,
          daoTreasury: daoTreasury.publicKey,
          operationsWallet: operationsWallet.publicKey,
          reserveWallet: reserveWallet.publicKey,
          receipt,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc(),
    );

    await program.methods
      .setPauseFlags({ characterPayment: false, buyEarth: false, deposit: false, withdraw: false })
      .accountsStrict({ authority: authority.publicKey, config })
      .signers([authority])
      .rpc();
  });

  it("buys, withdraws with server authorization, rejects expired authorization, and deposits back into escrow", async () => {
    const purchaseId = bytes(3);
    const [purchaseReceipt] = PublicKey.findProgramAddressSync(
      [PURCHASE_RECEIPT_SEED, player.publicKey.toBuffer(), Buffer.from(purchaseId)],
      PROGRAM_ID,
    );

    await program.methods
      .buyEarth(purchaseId, u64(1_000_000_000n))
      .accountsStrict({
        player: player.publicKey,
        config,
        earthMint,
        earthEscrow,
        daoTreasury: daoTreasury.publicKey,
        operationsWallet: operationsWallet.publicKey,
        reserveWallet: reserveWallet.publicKey,
        receipt: purchaseReceipt,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    expect((await getAccount(provider.connection, earthEscrow, undefined, TOKEN_2022_PROGRAM_ID)).amount).to.equal(350n * ONE_EARTH);

    const expiredWithdrawalId = bytes(4);
    const expired = BigInt(Math.floor(Date.now() / 1000) - 60);
    const [expiredRecord] = PublicKey.findProgramAddressSync(
      [WITHDRAWAL_RECORD_SEED, player.publicKey.toBuffer(), Buffer.from(expiredWithdrawalId)],
      PROGRAM_ID,
    );
    const expiredMessage = withdrawalMessage(player.publicKey, 10n * ONE_EARTH, expiredWithdrawalId, expired);
    const expiredSig = nacl.sign.detached(expiredMessage, serverAuthority.secretKey);
    const expiredTx = new Transaction().add(
      Ed25519Program.createInstructionWithPublicKey({
        publicKey: serverAuthority.publicKey.toBytes(),
        message: expiredMessage,
        signature: Buffer.from(expiredSig),
      }),
      await program.methods
        .withdrawEarth(expiredWithdrawalId, u64(10n * ONE_EARTH), i64(expired))
        .accountsStrict({
          player: player.publicKey,
          config,
          earthMint,
          earthEscrow,
          playerEarthAccount,
          withdrawalRecord: expiredRecord,
          instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction(),
    );
    await expectRejected(provider.sendAndConfirm(expiredTx, [player]));

    const withdrawalId = bytes(5);
    const expiry = BigInt(Math.floor(Date.now() / 1000) + 600);
    const [withdrawalRecord] = PublicKey.findProgramAddressSync(
      [WITHDRAWAL_RECORD_SEED, player.publicKey.toBuffer(), Buffer.from(withdrawalId)],
      PROGRAM_ID,
    );
    const message = withdrawalMessage(player.publicKey, 25n * ONE_EARTH, withdrawalId, expiry);
    const signature = nacl.sign.detached(message, serverAuthority.secretKey);
    const tx = new Transaction().add(
      Ed25519Program.createInstructionWithPublicKey({
        publicKey: serverAuthority.publicKey.toBytes(),
        message,
        signature: Buffer.from(signature),
      }),
      await program.methods
        .withdrawEarth(withdrawalId, u64(25n * ONE_EARTH), i64(expiry))
        .accountsStrict({
          player: player.publicKey,
          config,
          earthMint,
          earthEscrow,
          playerEarthAccount,
          withdrawalRecord,
          instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction(),
    );
    await provider.sendAndConfirm(tx, [player]);
    expect((await getAccount(provider.connection, playerEarthAccount, undefined, TOKEN_2022_PROGRAM_ID)).amount).to.equal(25n * ONE_EARTH);

    const depositId = bytes(6);
    const [depositReceipt] = PublicKey.findProgramAddressSync(
      [DEPOSIT_RECEIPT_SEED, player.publicKey.toBuffer(), Buffer.from(depositId)],
      PROGRAM_ID,
    );
    await program.methods
      .depositEarth(depositId, u64(10n * ONE_EARTH))
      .accountsStrict({
        player: player.publicKey,
        config,
        earthMint,
        playerEarthAccount,
        earthEscrow,
        receipt: depositReceipt,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    expect((await getAccount(provider.connection, playerEarthAccount, undefined, TOKEN_2022_PROGRAM_ID)).amount).to.equal(15n * ONE_EARTH);
    expect((await getAccount(provider.connection, earthEscrow, undefined, TOKEN_2022_PROGRAM_ID)).amount).to.equal(335n * ONE_EARTH);
  });
});
