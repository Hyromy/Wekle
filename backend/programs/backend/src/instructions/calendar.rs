use anchor_lang::prelude::*;

pub mod ctx {
    use super::*;
    use crate::{constants::CALENDAR_SEED, state::Calendar};

    #[derive(Accounts)]
    #[instruction(id: u64)]
    pub struct CreateCalendar<'info> {
        #[account(mut)]
        pub authority: Signer<'info>,

        #[account(
            init,
            payer = authority,
            space = 8 + Calendar::INIT_SPACE,
            seeds = [CALENDAR_SEED, authority.key().as_ref(), &id.to_le_bytes()],
            bump
        )]
        pub calendar: Account<'info, Calendar>,

        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct UpdateCalendar<'info> {
        pub authority: Signer<'info>,

        #[account(
            mut,
            has_one = authority,
            seeds = [CALENDAR_SEED, authority.key().as_ref(), &calendar.id.to_le_bytes()],
            bump = calendar.bump
        )]
        pub calendar: Account<'info, Calendar>,
    }

    #[derive(Accounts)]
    pub struct DeleteCalendar<'info> {
        #[account(mut)]
        pub authority: Signer<'info>,

        #[account(
            mut,
            close = authority,
            has_one = authority,
            seeds = [CALENDAR_SEED, authority.key().as_ref(), &calendar.id.to_le_bytes()],
            bump = calendar.bump
        )]
        pub calendar: Account<'info, Calendar>,
    }
}

pub mod fns {
    use super::{ctx::*, *};
    use crate::error::Err;

    pub fn create(
        ctx: Context<CreateCalendar>,
        id: u64,
        name:String
    ) -> Result<()> {
        require!(!name.trim().is_empty(), Err::Empty);
        require!(name.chars().count() <= 50, Err::TittleTooLong);

        let calendar = &mut ctx.accounts.calendar;
        calendar.id = id;
        calendar.name = name;
        calendar.authority = ctx.accounts.authority.key();
        calendar.bump = ctx.bumps.calendar;

        Ok(())
    }

    pub fn update(
        ctx: Context<UpdateCalendar>,
        name: String
    ) -> Result<()> {
        require!(!name.trim().is_empty(), Err::Empty);
        require!(name.chars().count() <= 50, Err::TittleTooLong);

        let calendar = &mut ctx.accounts.calendar;
        calendar.name = name;

        Ok(())
    }

    pub fn delete(_ctx: Context<DeleteCalendar>) -> Result<()> {
        Ok(())
    }
}

pub use ctx::*;
