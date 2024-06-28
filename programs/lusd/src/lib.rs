use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

declare_id!("7YMgh7tHNP1mahFrpL4GYT6GeCQ3KmyM2gZCirJF2epV");

#[program]
pub mod vault {

    use super::*;

    pub fn init_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.owner.key();
        vault.mint = ctx.accounts.mint_address.key();
        vault.bump = [*ctx.bumps.get("vault").unwrap()];

        Ok(())
    }

    pub fn deposit_vault(ctx: Context<DepositVault>, amount: u64) -> Result<()> {
        anchor_spl::token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.owner_token_account.to_account_info(),
                    to: ctx.accounts.vault_token_account.to_account_info(),
                    authority: ctx.accounts.owner.to_account_info(),
                },
            ),
            amount,
        )
    }

    pub fn withdraw_vault(ctx: Context<WithdrawVault>, amount: u64) -> Result<()> {
        anchor_spl::token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                anchor_spl::token::Transfer {
                    from: ctx.accounts.vault_token_account.to_account_info(),
                    to: ctx.accounts.owner_token_account.to_account_info(),
                    authority: ctx.accounts.vault.to_account_info(),
                },
                &[&ctx.accounts.vault.signer_seeds()],
            ),
            amount,
        )
    }

    pub fn lulo_deposit(ctx: Context<LuloDeposit>, amount: u64) -> Result<()> {
        lulo_cpi::cpi::initiate_deposit(
            CpiContext::new_with_signer(
                ctx.accounts.lulo_program.to_account_info(),
                lulo_cpi::cpi::accounts::InitiateDeposit {
                    owner: ctx.accounts.vault.to_account_info(),
                    fee_payer: ctx.accounts.owner.to_account_info(),
                    owner_token_account: ctx.accounts.vault_token_account.to_account_info(),
                    user_account: ctx.accounts.lulo_user_account.to_account_info(),
                    flex_user_token_account: ctx.accounts.lulo_user_token_account.to_account_info(),
                    mint_address: ctx.accounts.mint_address.to_account_info(),
                    promotion_reserve: ctx.accounts.lulo_promotion_reserve.to_account_info(),
                    flex_program: ctx.accounts.lulo_program.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    associated_token_program: ctx
                        .accounts
                        .associated_token_program
                        .to_account_info(),
                },
                &[&ctx.accounts.vault.signer_seeds()],
            ),
            amount,
            None, // allowed protocols, None = All protocols
            None, // end_date, None = no end_date
            None, // return_type
        )
    }

    pub fn lulo_withdraw(ctx: Context<LuloWithdraw>, amount: u64) -> Result<()> {
        lulo_cpi::cpi::initiate_withdraw(
            CpiContext::new_with_signer(
                ctx.accounts.lulo_program.to_account_info(),
                lulo_cpi::cpi::accounts::InitiateWithdraw {
                    owner: ctx.accounts.vault.to_account_info(),
                    fee_payer: ctx.accounts.owner.to_account_info(),
                    owner_token_account: ctx.accounts.vault_token_account.to_account_info(),
                    user_account: ctx.accounts.lulo_user_account.to_account_info(),
                    flex_user_token_account: ctx.accounts.lulo_user_token_account.to_account_info(),
                    mint_address: ctx.accounts.mint_address.to_account_info(),
                    promotion_reserve: ctx.accounts.lulo_promotion_reserve.to_account_info(),
                    flex_program: ctx.accounts.lulo_program.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    associated_token_program: ctx
                        .accounts
                        .associated_token_program
                        .to_account_info(),
                },
                &[&ctx.accounts.vault.signer_seeds()],
            ),
            amount, // withdraw_amount
            false,  // withdraw_all
            None,   // return_type
        )
    }
}

#[account]
#[derive(Debug)]
pub struct Vault {
    pub bump: [u8; 1],
    pub _padding: [u8; 7],
    pub owner: Pubkey,
    pub mint: Pubkey,
}

impl Vault {
    pub const LEN: usize = 8 + 32 + 32;

    pub fn signer_seeds(&self) -> [&[u8]; 4] {
        [
            b"vault",
            self.mint.as_ref(),
            self.owner.as_ref(),
            self.bump.as_ref(),
        ]
    }
}

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub mint_address: Account<'info, Mint>,

    #[account(
        init,
        payer = owner,
        space = 8 + Vault::LEN,
        seeds = [
            b"vault",
            mint_address.key().as_ref(),
            owner.key().as_ref(),
        ],
        bump,
    )]
    pub vault: Account<'info, Vault>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct DepositVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [
            b"vault",
            mint_address.key().as_ref(),
            owner.key().as_ref(),
        ],
        bump = vault.bump[0],
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub mint_address: Account<'info, Mint>,

    #[account(
	    mut,
	    token::mint = mint_address,
	    token::authority = owner,
		constraint = owner_token_account.amount >= amount
	)]
    pub owner_token_account: Account<'info, TokenAccount>,

    #[account(
		init_if_needed,
		payer = owner,
	    associated_token::mint = mint_address,
	    associated_token::authority = vault,
	)]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct WithdrawVault<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [
            b"vault",
            mint_address.key().as_ref(),
            owner.key().as_ref(),
        ],
        bump = vault.bump[0],
    )]
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub mint_address: Account<'info, Mint>,

    #[account(
	    mut,
	    token::mint = mint_address,
	    token::authority = owner,
	)]
    pub owner_token_account: Account<'info, TokenAccount>,

    #[account(
		mut,
	    associated_token::mint = mint_address,
	    associated_token::authority = vault,
		constraint = vault_token_account.amount >= amount
	)]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct LuloDeposit<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"vault",
            mint_address.key().as_ref(),
            owner.key().as_ref(),
        ],
        bump = vault.bump[0],
    )]
    pub vault: Account<'info, Vault>,

    #[account(
		mut,
	    associated_token::mint = mint_address,
	    associated_token::authority = vault,
		constraint = vault_token_account.amount >= amount
	)]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account()]
    pub mint_address: Account<'info, Mint>,

    #[account(mut)]
    /// CHECK: cpi
    pub lulo_user_account: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: cpi
    pub lulo_user_token_account: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: CPI
    pub lulo_promotion_reserve: AccountInfo<'info>,

    #[account(address = lulo_cpi::ID)]
    /// CHECK: CPI
    pub lulo_program: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct LuloWithdraw<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"vault",
            mint_address.key().as_ref(),
            owner.key().as_ref(),
        ],
        bump = vault.bump[0],
    )]
    pub vault: Account<'info, Vault>,

    #[account(
		mut,
	    associated_token::mint = mint_address,
	    associated_token::authority = vault,
	)]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account()]
    pub mint_address: Account<'info, Mint>,

    #[account(mut)]
    /// CHECK: cpi
    pub lulo_user_account: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: cpi
    pub lulo_user_token_account: AccountInfo<'info>,

    #[account(mut)]
    /// CHECK: CPI
    pub lulo_promotion_reserve: AccountInfo<'info>,

    #[account(address = lulo_cpi::ID)]
    /// CHECK: CPI
    pub lulo_program: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
