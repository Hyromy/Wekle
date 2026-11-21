use anchor_lang::prelude::*;

// This file is like a Controller of MVC
// First contexts
// Last functions

pub mod ctx {
    use super::*;
    use crate::{
        constants::EVENT_SEED,
        state::{Calendar, Event},
    };

    // The struct could be just "Create", but Anchor exports contexts to the crate root where names may collide
    #[derive(Accounts)]
    #[instruction(id: u64)]
    pub struct CreateEvent<'info> {
        #[account(mut)]
        pub authority: Signer<'info>,

        #[account(has_one = authority)]
        pub calendar: Account<'info, Calendar>,

        #[account(
            init,
            payer = authority,
            space = 8 + Event::INIT_SPACE,
            seeds = [EVENT_SEED, calendar.key().as_ref(), &id.to_le_bytes()],
            bump
        )]
        pub event: Account<'info, Event>,

        // system_program is required when you create
        pub system_program: Program<'info, System>,
    }

    #[derive(Accounts)]
    pub struct UpdateEvent<'info> {
        pub authority: Signer<'info>,

        #[account(
            mut,
            has_one = authority,
            seeds = [EVENT_SEED, event.calendar.key().as_ref(), &event.id.to_le_bytes()],
            bump = event.bump
        )]
        pub event: Account<'info, Event>,
    }

    #[derive(Accounts)]
    pub struct DeleteEvent<'info> {
        #[account(mut)]
        pub authority: Signer<'info>,

        #[account(
            mut,
            close = authority,
            has_one = authority,
            seeds = [EVENT_SEED, event.calendar.key().as_ref(), &event.id.to_le_bytes()],
            bump = event.bump
        )]
        pub event: Account<'info, Event>,
    }
}

pub mod fns {
    use super::{ctx::*, *};
    use crate::error::Err;

    pub fn create(
        ctx: Context<CreateEvent>,
        id: u64,
        title: String,
        content: String,
        start_at: i64,
        end_at: i64,
    ) -> Result<()> {
        require!(!title.trim().is_empty(), Err::Empty);
        require!(title.chars().count() <= 50, Err::TittleTooLong);
        require!(content.chars().count() <= 200, Err::ContentTooLong);
        require!(end_at >= start_at, Err::InvalidTimeRange);

        let event = &mut ctx.accounts.event;
        event.id = id;
        event.calendar = ctx.accounts.calendar.key();
        event.title = title;
        event.content = content;
        event.start_at = start_at;
        event.end_at = end_at;
        event.authority = ctx.accounts.authority.key();
        event.bump = ctx.bumps.event;

        Ok(())
    }

    pub fn update(
        ctx: Context<UpdateEvent>,
        title: String,
        content: String,
        start_at: i64,
        end_at: i64,
    ) -> Result<()> {
        require!(!title.trim().is_empty(), Err::Empty);
        require!(title.chars().count() <= 50, Err::TittleTooLong);
        require!(content.chars().count() <= 200, Err::ContentTooLong);
        require!(end_at >= start_at, Err::InvalidTimeRange);

        let event = &mut ctx.accounts.event;
        event.title = title;
        event.content = content;
        event.start_at = start_at;
        event.end_at = end_at;

        Ok(())
    }

    pub fn delete(_ctx: Context<DeleteEvent>) -> Result<()> {
        Ok(())
    }
}

pub use ctx::*;
