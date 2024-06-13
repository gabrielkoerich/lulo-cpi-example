use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

declare_id!("7YMgh7tHNP1mahFrpL4GYT6GeCQ3KmyM2gZCirJF2epV");

#[program]
pub mod lulo_integration {

    use lulo_cpi::cpi::accounts::InitiateDeposit;

    use super::*;

    pub fn init_vault(ctx: Context<InitializeVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.owner.key();
        vault.mint = ctx.accounts.mint_address.key();
        vault.bump = [*ctx.bumps.get("vault").unwrap()];

        msg!("vault: {:?}", vault);

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
        )?;

        Ok(())
    }

    pub fn lulo_deposit(ctx: Context<LuloDeposit>, amount: u64) -> Result<()> {
        let vault = &ctx.accounts.vault;
        let owner = &ctx.accounts.owner;
        // let fee_payer = &ctx.accounts.fee_payer;

        msg!("owner: {:?}", owner);
        // msg!("fee_payer: {:?}", fee_payer);

        lulo_cpi::cpi::initiate_deposit(
            CpiContext::new_with_signer(
                ctx.accounts.lulo_program.to_account_info(),
                InitiateDeposit {
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
                &[&vault.signer_seeds()],
            ),
            amount,
            None, // allowed protocols, None = All protocols
            None, // end_date, None = no end_date
            None, // return_type
        )?;

        Ok(())
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
    pub fee_payer: Signer<'info>,

    #[account(mut)]
    pub mint_address: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = fee_payer,
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

    #[account(mut)]
    pub fee_payer: Signer<'info>,

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
    pub mint_address: Box<Account<'info, Mint>>,

    #[account(
	    mut,
	    token::mint = mint_address,
	    token::authority = owner,
		constraint = owner_token_account.amount >= amount
	)]
    pub owner_token_account: Account<'info, TokenAccount>,

    #[account(
		init_if_needed,
		payer = fee_payer,
	    associated_token::mint = mint_address,
	    associated_token::authority = vault,
	)]
    pub vault_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
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
	)]
    pub vault_token_account: Account<'info, TokenAccount>,

    #[account()]
    pub mint_address: Account<'info, Mint>,

    #[account(mut)]
    /// CHECK: cpi
    pub lulo_user_account: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: cpi
    pub lulo_user_token_account: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: CPI
    pub lulo_promotion_reserve: UncheckedAccount<'info>,

    #[account(address = lulo_cpi::ID)]
    /// CHECK: CPI
    pub lulo_program: AccountInfo<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}
