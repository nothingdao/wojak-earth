use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::{
    load_current_index_checked, load_instruction_at_checked,
};
use anchor_lang::system_program::{self, Transfer as SolTransfer};
use anchor_spl::token_interface::{
    self, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked,
};

declare_id!("J3jkrtAqnr7Vs6evka3wdugjdagwUJhGj3Mzae6wdABB");

const EARTH_VAULT_CONFIG_SEED: &[u8] = b"earth-vault-config";
const CHARACTER_MINT_RECEIPT_SEED: &[u8] = b"character-mint-receipt";
const PURCHASE_RECEIPT_SEED: &[u8] = b"purchase-receipt";
const DEPOSIT_RECEIPT_SEED: &[u8] = b"deposit-receipt";
const WITHDRAWAL_RECORD_SEED: &[u8] = b"withdrawal-record";
const BPS_DENOMINATOR: u64 = 10_000;
const ED25519_PROGRAM_ID: Pubkey = pubkey!("Ed25519SigVerify111111111111111111111111111");

#[program]
pub mod earth_vault_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, args: InitializeArgs) -> Result<()> {
        args.splits.validate()?;
        require!(args.character_price_lamports > 0, EarthVaultError::InvalidAmount);
        require!(args.earth_per_sol > 0, EarthVaultError::InvalidAmount);

        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.earth_mint = ctx.accounts.earth_mint.key();
        config.dao_treasury = ctx.accounts.dao_treasury.key();
        config.operations_wallet = ctx.accounts.operations_wallet.key();
        config.reserve_wallet = ctx.accounts.reserve_wallet.key();
        config.server_authority = args.server_authority;
        config.splits = args.splits;
        config.character_price_lamports = args.character_price_lamports;
        config.starter_earth_amount = args.starter_earth_amount;
        config.earth_per_sol = args.earth_per_sol;
        config.paused = PauseFlags::default();
        config.bump = ctx.bumps.config;

        emit!(ConfigInitialized {
            authority: config.authority,
            earth_mint: config.earth_mint,
            dao_treasury: config.dao_treasury,
            operations_wallet: config.operations_wallet,
            reserve_wallet: config.reserve_wallet,
            server_authority: config.server_authority,
        });

        Ok(())
    }

    pub fn update_config(ctx: Context<UpdateConfig>, args: UpdateConfigArgs) -> Result<()> {
        args.splits.validate()?;
        require!(args.character_price_lamports > 0, EarthVaultError::InvalidAmount);
        require!(args.earth_per_sol > 0, EarthVaultError::InvalidAmount);

        let config = &mut ctx.accounts.config;
        config.dao_treasury = args.dao_treasury;
        config.operations_wallet = args.operations_wallet;
        config.reserve_wallet = args.reserve_wallet;
        config.server_authority = args.server_authority;
        config.splits = args.splits;
        config.character_price_lamports = args.character_price_lamports;
        config.starter_earth_amount = args.starter_earth_amount;
        config.earth_per_sol = args.earth_per_sol;

        emit!(ConfigUpdated {
            authority: config.authority,
            dao_treasury: config.dao_treasury,
            operations_wallet: config.operations_wallet,
            reserve_wallet: config.reserve_wallet,
            server_authority: config.server_authority,
        });

        Ok(())
    }

    pub fn set_pause_flags(ctx: Context<UpdateConfig>, paused: PauseFlags) -> Result<()> {
        ctx.accounts.config.paused = paused;
        emit!(PauseFlagsUpdated { paused });
        Ok(())
    }

    pub fn character_payment(
        ctx: Context<CharacterPayment>,
        receipt_id: [u8; 32],
        lamports: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.config.paused.character_payment, EarthVaultError::Paused);
        require!(lamports == ctx.accounts.config.character_price_lamports, EarthVaultError::InvalidAmount);

        let splits = split_lamports(lamports, ctx.accounts.config.splits)?;
        transfer_sol(&ctx.accounts.player, &ctx.accounts.dao_treasury, &ctx.accounts.system_program, splits.dao)?;
        transfer_sol(&ctx.accounts.player, &ctx.accounts.operations_wallet, &ctx.accounts.system_program, splits.operations)?;
        transfer_sol(&ctx.accounts.player, &ctx.accounts.reserve_wallet, &ctx.accounts.system_program, splits.reserve)?;

        mint_earth_to_escrow(
            &ctx.accounts.config,
            &ctx.accounts.earth_mint,
            &ctx.accounts.earth_escrow,
            &ctx.accounts.token_program,
            ctx.accounts.config.starter_earth_amount,
        )?;

        let now = Clock::get()?.unix_timestamp;
        let receipt = &mut ctx.accounts.receipt;
        receipt.receipt_id = receipt_id;
        receipt.player = ctx.accounts.player.key();
        receipt.lamports_paid = lamports;
        receipt.earth_credited = ctx.accounts.config.starter_earth_amount;
        receipt.created_at = now;
        receipt.finalized = false;
        receipt.bump = ctx.bumps.receipt;

        emit!(CharacterPaymentReceived {
            receipt: receipt.key(),
            receipt_id,
            player: receipt.player,
            lamports_paid: lamports,
            earth_credited: receipt.earth_credited,
        });

        Ok(())
    }

    pub fn finalize_character_receipt(ctx: Context<FinalizeCharacterReceipt>) -> Result<()> {
        require!(!ctx.accounts.receipt.finalized, EarthVaultError::ReceiptAlreadyFinalized);
        ctx.accounts.receipt.finalized = true;
        emit!(CharacterReceiptFinalized {
            receipt: ctx.accounts.receipt.key(),
            player: ctx.accounts.receipt.player,
            receipt_id: ctx.accounts.receipt.receipt_id,
        });
        Ok(())
    }

    pub fn buy_earth(ctx: Context<BuyEarth>, receipt_id: [u8; 32], lamports: u64) -> Result<()> {
        require!(!ctx.accounts.config.paused.buy_earth, EarthVaultError::Paused);
        require!(lamports > 0, EarthVaultError::InvalidAmount);

        let splits = split_lamports(lamports, ctx.accounts.config.splits)?;
        transfer_sol(&ctx.accounts.player, &ctx.accounts.dao_treasury, &ctx.accounts.system_program, splits.dao)?;
        transfer_sol(&ctx.accounts.player, &ctx.accounts.operations_wallet, &ctx.accounts.system_program, splits.operations)?;
        transfer_sol(&ctx.accounts.player, &ctx.accounts.reserve_wallet, &ctx.accounts.system_program, splits.reserve)?;

        let earth_amount = quote_earth(lamports, ctx.accounts.config.earth_per_sol)?;
        mint_earth_to_escrow(
            &ctx.accounts.config,
            &ctx.accounts.earth_mint,
            &ctx.accounts.earth_escrow,
            &ctx.accounts.token_program,
            earth_amount,
        )?;

        let now = Clock::get()?.unix_timestamp;
        let receipt = &mut ctx.accounts.receipt;
        receipt.receipt_id = receipt_id;
        receipt.player = ctx.accounts.player.key();
        receipt.lamports_paid = lamports;
        receipt.earth_credited = earth_amount;
        receipt.created_at = now;
        receipt.bump = ctx.bumps.receipt;

        emit!(EarthPurchased {
            receipt: receipt.key(),
            receipt_id,
            player: receipt.player,
            lamports_paid: lamports,
            earth_credited: earth_amount,
        });

        Ok(())
    }

    pub fn deposit_earth(ctx: Context<DepositEarth>, receipt_id: [u8; 32], amount: u64) -> Result<()> {
        require!(!ctx.accounts.config.paused.deposit, EarthVaultError::Paused);
        require!(amount > 0, EarthVaultError::InvalidAmount);

        let cpi_accounts = TransferChecked {
            from: ctx.accounts.player_earth_account.to_account_info(),
            mint: ctx.accounts.earth_mint.to_account_info(),
            to: ctx.accounts.earth_escrow.to_account_info(),
            authority: ctx.accounts.player.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token_interface::transfer_checked(cpi_ctx, amount, ctx.accounts.earth_mint.decimals)?;

        let now = Clock::get()?.unix_timestamp;
        let receipt = &mut ctx.accounts.receipt;
        receipt.receipt_id = receipt_id;
        receipt.player = ctx.accounts.player.key();
        receipt.amount = amount;
        receipt.created_at = now;
        receipt.bump = ctx.bumps.receipt;

        emit!(EarthDeposited {
            receipt: receipt.key(),
            receipt_id,
            player: receipt.player,
            amount,
        });

        Ok(())
    }

    pub fn withdraw_earth(
        ctx: Context<WithdrawEarth>,
        withdrawal_id: [u8; 32],
        amount: u64,
        expiry: i64,
    ) -> Result<()> {
        require!(!ctx.accounts.config.paused.withdraw, EarthVaultError::Paused);
        require!(amount > 0, EarthVaultError::InvalidAmount);
        require!(ctx.accounts.earth_escrow.amount >= amount, EarthVaultError::InsufficientEscrowBalance);

        let now = Clock::get()?.unix_timestamp;
        require!(expiry >= now, EarthVaultError::AuthorizationExpired);
        verify_ed25519_withdrawal(
            &ctx.accounts.instructions_sysvar,
            ctx.accounts.config.server_authority,
            ctx.accounts.player.key(),
            amount,
            withdrawal_id,
            expiry,
        )?;

        let authority_key = ctx.accounts.config.authority;
        let signer_seeds: &[&[u8]] = &[EARTH_VAULT_CONFIG_SEED, authority_key.as_ref(), &[ctx.accounts.config.bump]];
        let signer_binding = [signer_seeds];
        let cpi_accounts = TransferChecked {
            from: ctx.accounts.earth_escrow.to_account_info(),
            mint: ctx.accounts.earth_mint.to_account_info(),
            to: ctx.accounts.player_earth_account.to_account_info(),
            authority: ctx.accounts.config.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            &signer_binding,
        );
        token_interface::transfer_checked(cpi_ctx, amount, ctx.accounts.earth_mint.decimals)?;

        let record = &mut ctx.accounts.withdrawal_record;
        record.withdrawal_id = withdrawal_id;
        record.player = ctx.accounts.player.key();
        record.amount = amount;
        record.expiry = expiry;
        record.withdrawn_at = now;
        record.bump = ctx.bumps.withdrawal_record;

        emit!(EarthWithdrawn {
            record: record.key(),
            withdrawal_id,
            player: record.player,
            amount,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + EarthVaultConfig::INIT_SPACE,
        seeds = [EARTH_VAULT_CONFIG_SEED, authority.key().as_ref()],
        bump
    )]
    pub config: Account<'info, EarthVaultConfig>,
    #[account(mut)]
    pub earth_mint: InterfaceAccount<'info, Mint>,
    /// CHECK: stored as configured treasury recipient
    pub dao_treasury: UncheckedAccount<'info>,
    /// CHECK: stored as configured operations recipient
    pub operations_wallet: UncheckedAccount<'info>,
    /// CHECK: stored as configured reserve/liquidity recipient
    pub reserve_wallet: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority @ EarthVaultError::Unauthorized)]
    pub config: Account<'info, EarthVaultConfig>,
}

#[derive(Accounts)]
#[instruction(receipt_id: [u8; 32])]
pub struct CharacterPayment<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(mut, has_one = earth_mint, has_one = dao_treasury, has_one = operations_wallet, has_one = reserve_wallet)]
    pub config: Account<'info, EarthVaultConfig>,
    #[account(mut)]
    pub earth_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = earth_mint,
        associated_token::authority = config,
        associated_token::token_program = token_program
    )]
    pub earth_escrow: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub dao_treasury: SystemAccount<'info>,
    #[account(mut)]
    pub operations_wallet: SystemAccount<'info>,
    #[account(mut)]
    pub reserve_wallet: SystemAccount<'info>,
    #[account(
        init,
        payer = player,
        space = 8 + CharacterMintReceipt::INIT_SPACE,
        seeds = [CHARACTER_MINT_RECEIPT_SEED, player.key().as_ref(), receipt_id.as_ref()],
        bump
    )]
    pub receipt: Account<'info, CharacterMintReceipt>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeCharacterReceipt<'info> {
    pub server_authority: Signer<'info>,
    #[account(has_one = server_authority @ EarthVaultError::Unauthorized)]
    pub config: Account<'info, EarthVaultConfig>,
    #[account(mut)]
    pub receipt: Account<'info, CharacterMintReceipt>,
}

#[derive(Accounts)]
#[instruction(receipt_id: [u8; 32])]
pub struct BuyEarth<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(mut, has_one = earth_mint, has_one = dao_treasury, has_one = operations_wallet, has_one = reserve_wallet)]
    pub config: Account<'info, EarthVaultConfig>,
    #[account(mut)]
    pub earth_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = earth_mint,
        associated_token::authority = config,
        associated_token::token_program = token_program
    )]
    pub earth_escrow: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub dao_treasury: SystemAccount<'info>,
    #[account(mut)]
    pub operations_wallet: SystemAccount<'info>,
    #[account(mut)]
    pub reserve_wallet: SystemAccount<'info>,
    #[account(
        init,
        payer = player,
        space = 8 + PurchaseReceipt::INIT_SPACE,
        seeds = [PURCHASE_RECEIPT_SEED, player.key().as_ref(), receipt_id.as_ref()],
        bump
    )]
    pub receipt: Account<'info, PurchaseReceipt>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(receipt_id: [u8; 32])]
pub struct DepositEarth<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(has_one = earth_mint)]
    pub config: Account<'info, EarthVaultConfig>,
    #[account(mut)]
    pub earth_mint: InterfaceAccount<'info, Mint>,
    #[account(mut, token::mint = earth_mint, token::authority = player)]
    pub player_earth_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = earth_mint,
        associated_token::authority = config,
        associated_token::token_program = token_program
    )]
    pub earth_escrow: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = player,
        space = 8 + DepositReceipt::INIT_SPACE,
        seeds = [DEPOSIT_RECEIPT_SEED, player.key().as_ref(), receipt_id.as_ref()],
        bump
    )]
    pub receipt: Account<'info, DepositReceipt>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(withdrawal_id: [u8; 32])]
pub struct WithdrawEarth<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(has_one = earth_mint)]
    pub config: Account<'info, EarthVaultConfig>,
    #[account(mut)]
    pub earth_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = earth_mint,
        associated_token::authority = config,
        associated_token::token_program = token_program
    )]
    pub earth_escrow: InterfaceAccount<'info, TokenAccount>,
    #[account(mut, token::mint = earth_mint, token::authority = player)]
    pub player_earth_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init,
        payer = player,
        space = 8 + WithdrawalRecord::INIT_SPACE,
        seeds = [WITHDRAWAL_RECORD_SEED, player.key().as_ref(), withdrawal_id.as_ref()],
        bump
    )]
    pub withdrawal_record: Account<'info, WithdrawalRecord>,
    /// CHECK: Solana instructions sysvar for ed25519 verification.
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct EarthVaultConfig {
    pub authority: Pubkey,
    pub earth_mint: Pubkey,
    pub dao_treasury: Pubkey,
    pub operations_wallet: Pubkey,
    pub reserve_wallet: Pubkey,
    pub server_authority: Pubkey,
    pub splits: PaymentSplits,
    pub character_price_lamports: u64,
    pub starter_earth_amount: u64,
    pub earth_per_sol: u64,
    pub paused: PauseFlags,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct CharacterMintReceipt {
    pub receipt_id: [u8; 32],
    pub player: Pubkey,
    pub lamports_paid: u64,
    pub earth_credited: u64,
    pub created_at: i64,
    pub finalized: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct PurchaseReceipt {
    pub receipt_id: [u8; 32],
    pub player: Pubkey,
    pub lamports_paid: u64,
    pub earth_credited: u64,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct DepositReceipt {
    pub receipt_id: [u8; 32],
    pub player: Pubkey,
    pub amount: u64,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct WithdrawalRecord {
    pub withdrawal_id: [u8; 32],
    pub player: Pubkey,
    pub amount: u64,
    pub expiry: i64,
    pub withdrawn_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, InitSpace)]
pub struct PaymentSplits {
    pub dao_bps: u16,
    pub operations_bps: u16,
    pub reserve_bps: u16,
}

impl PaymentSplits {
    pub fn validate(&self) -> Result<()> {
        require!(
            self.dao_bps as u64 + self.operations_bps as u64 + self.reserve_bps as u64 == BPS_DENOMINATOR,
            EarthVaultError::InvalidSplits
        );
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, InitSpace)]
pub struct PauseFlags {
    pub character_payment: bool,
    pub buy_earth: bool,
    pub deposit: bool,
    pub withdraw: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct InitializeArgs {
    pub server_authority: Pubkey,
    pub splits: PaymentSplits,
    pub character_price_lamports: u64,
    pub starter_earth_amount: u64,
    pub earth_per_sol: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct UpdateConfigArgs {
    pub dao_treasury: Pubkey,
    pub operations_wallet: Pubkey,
    pub reserve_wallet: Pubkey,
    pub server_authority: Pubkey,
    pub splits: PaymentSplits,
    pub character_price_lamports: u64,
    pub starter_earth_amount: u64,
    pub earth_per_sol: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct SplitAmounts {
    pub dao: u64,
    pub operations: u64,
    pub reserve: u64,
}

#[event]
pub struct ConfigInitialized {
    pub authority: Pubkey,
    pub earth_mint: Pubkey,
    pub dao_treasury: Pubkey,
    pub operations_wallet: Pubkey,
    pub reserve_wallet: Pubkey,
    pub server_authority: Pubkey,
}

#[event]
pub struct ConfigUpdated {
    pub authority: Pubkey,
    pub dao_treasury: Pubkey,
    pub operations_wallet: Pubkey,
    pub reserve_wallet: Pubkey,
    pub server_authority: Pubkey,
}

#[event]
pub struct PauseFlagsUpdated {
    pub paused: PauseFlags,
}

#[event]
pub struct CharacterPaymentReceived {
    pub receipt: Pubkey,
    pub receipt_id: [u8; 32],
    pub player: Pubkey,
    pub lamports_paid: u64,
    pub earth_credited: u64,
}

#[event]
pub struct CharacterReceiptFinalized {
    pub receipt: Pubkey,
    pub player: Pubkey,
    pub receipt_id: [u8; 32],
}

#[event]
pub struct EarthPurchased {
    pub receipt: Pubkey,
    pub receipt_id: [u8; 32],
    pub player: Pubkey,
    pub lamports_paid: u64,
    pub earth_credited: u64,
}

#[event]
pub struct EarthDeposited {
    pub receipt: Pubkey,
    pub receipt_id: [u8; 32],
    pub player: Pubkey,
    pub amount: u64,
}

#[event]
pub struct EarthWithdrawn {
    pub record: Pubkey,
    pub withdrawal_id: [u8; 32],
    pub player: Pubkey,
    pub amount: u64,
}

fn split_lamports(amount: u64, splits: PaymentSplits) -> Result<SplitAmounts> {
    splits.validate()?;
    let dao = mul_div(amount, splits.dao_bps as u64, BPS_DENOMINATOR)?;
    let operations = mul_div(amount, splits.operations_bps as u64, BPS_DENOMINATOR)?;
    let reserve = amount
        .checked_sub(dao)
        .and_then(|remaining| remaining.checked_sub(operations))
        .ok_or(EarthVaultError::MathOverflow)?;
    Ok(SplitAmounts { dao, operations, reserve })
}

fn quote_earth(lamports: u64, earth_per_sol: u64) -> Result<u64> {
    mul_div(lamports, earth_per_sol, 1_000_000_000)
}

fn mul_div(amount: u64, numerator: u64, denominator: u64) -> Result<u64> {
    require!(denominator > 0, EarthVaultError::InvalidAmount);
    let value = (amount as u128)
        .checked_mul(numerator as u128)
        .ok_or(EarthVaultError::MathOverflow)?
        .checked_div(denominator as u128)
        .ok_or(EarthVaultError::MathOverflow)?;
    u64::try_from(value).map_err(|_| EarthVaultError::MathOverflow.into())
}

fn transfer_sol<'info>(
    from: &Signer<'info>,
    to: &SystemAccount<'info>,
    system_program: &Program<'info, System>,
    lamports: u64,
) -> Result<()> {
    if lamports == 0 {
        return Ok(());
    }
    let cpi_accounts = SolTransfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(system_program.to_account_info(), cpi_accounts);
    system_program::transfer(cpi_ctx, lamports)
}

fn mint_earth_to_escrow<'info>(
    config: &Account<'info, EarthVaultConfig>,
    earth_mint: &InterfaceAccount<'info, Mint>,
    earth_escrow: &InterfaceAccount<'info, TokenAccount>,
    token_program: &Interface<'info, TokenInterface>,
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    let authority_key = config.authority;
    let signer_seeds: &[&[u8]] = &[EARTH_VAULT_CONFIG_SEED, authority_key.as_ref(), &[config.bump]];
    let signer_binding = [signer_seeds];
    let cpi_accounts = MintTo {
        mint: earth_mint.to_account_info(),
        to: earth_escrow.to_account_info(),
        authority: config.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(token_program.to_account_info(), cpi_accounts, &signer_binding);
    token_interface::mint_to(cpi_ctx, amount)
}

fn verify_ed25519_withdrawal(
    instructions_sysvar: &UncheckedAccount,
    authority: Pubkey,
    player: Pubkey,
    amount: u64,
    withdrawal_id: [u8; 32],
    expiry: i64,
) -> Result<()> {
    let current_index = load_current_index_checked(&instructions_sysvar.to_account_info())?;
    require!(current_index > 0, EarthVaultError::MissingAuthorization);

    let instruction = load_instruction_at_checked(
        (current_index - 1) as usize,
        &instructions_sysvar.to_account_info(),
    )?;
    require!(instruction.program_id == ED25519_PROGRAM_ID, EarthVaultError::MissingAuthorization);

    let expected_message = withdrawal_message(player, amount, withdrawal_id, expiry);
    require!(
        ed25519_instruction_matches(&instruction.data, authority, &expected_message),
        EarthVaultError::InvalidAuthorization
    );

    Ok(())
}

fn withdrawal_message(player: Pubkey, amount: u64, withdrawal_id: [u8; 32], expiry: i64) -> Vec<u8> {
    let mut message = b"earth-vault-withdraw".to_vec();
    message.extend_from_slice(player.as_ref());
    message.extend_from_slice(&amount.to_le_bytes());
    message.extend_from_slice(&withdrawal_id);
    message.extend_from_slice(&expiry.to_le_bytes());
    message
}

fn ed25519_instruction_matches(data: &[u8], authority: Pubkey, expected_message: &[u8]) -> bool {
    const HEADER_LEN: usize = 16;
    const PUBLIC_KEY_LEN: usize = 32;
    const SIGNATURE_LEN: usize = 64;
    if data.len() < HEADER_LEN || data[0] != 1 {
        return false;
    }

    let signature_offset = u16::from_le_bytes([data[2], data[3]]) as usize;
    let public_key_offset = u16::from_le_bytes([data[6], data[7]]) as usize;
    let message_offset = u16::from_le_bytes([data[10], data[11]]) as usize;
    let message_size = u16::from_le_bytes([data[12], data[13]]) as usize;

    let public_key_end = public_key_offset.saturating_add(PUBLIC_KEY_LEN);
    let signature_end = signature_offset.saturating_add(SIGNATURE_LEN);
    let message_end = message_offset.saturating_add(message_size);

    if public_key_end > data.len() || signature_end > data.len() || message_end > data.len() {
        return false;
    }

    data[public_key_offset..public_key_end] == authority.to_bytes()
        && message_size == expected_message.len()
        && &data[message_offset..message_end] == expected_message
}

#[error_code]
pub enum EarthVaultError {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Payment split basis points must total 10000")]
    InvalidSplits,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Instruction is paused")]
    Paused,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Receipt has already been finalized")]
    ReceiptAlreadyFinalized,
    #[msg("Missing withdrawal authorization")]
    MissingAuthorization,
    #[msg("Invalid withdrawal authorization")]
    InvalidAuthorization,
    #[msg("Withdrawal authorization expired")]
    AuthorizationExpired,
    #[msg("Insufficient escrow balance")]
    InsufficientEscrowBalance,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn valid_splits() -> PaymentSplits {
        PaymentSplits { dao_bps: 5000, operations_bps: 3000, reserve_bps: 2000 }
    }

    #[test]
    fn split_math_assigns_rounding_to_reserve() {
        let split = split_lamports(101, valid_splits()).unwrap();
        assert_eq!(split, SplitAmounts { dao: 50, operations: 30, reserve: 21 });
    }

    #[test]
    fn rejects_invalid_splits() {
        let splits = PaymentSplits { dao_bps: 5000, operations_bps: 3000, reserve_bps: 1000 };
        assert!(splits.validate().is_err());
    }

    #[test]
    fn quote_uses_configured_run_price() {
        assert_eq!(quote_earth(2_000_000_000, 1_500_000_000).unwrap(), 3_000_000_000);
    }

    #[test]
    fn withdrawal_message_is_domain_separated() {
        let player = Pubkey::new_unique();
        let message = withdrawal_message(player, 42, [7; 32], 1234);
        assert!(message.starts_with(b"earth-vault-withdraw"));
        assert!(message.windows(32).any(|window| window == player.as_ref()));
    }
}
