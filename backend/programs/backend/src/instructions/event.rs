use anchor_lang::prelude::*;

// This file is like a Controller of MVC
// First contexts
// Last functions

pub mod ctx {
    use super::*;
    use crate::{constants::EVENT_SEED, state::Event};

    // The struct could be just "Create", but Anchor exports contexts to the crate root where names may collide
    #[derive(Accounts)]
    #[instruction(id: u64)]
    pub struct CreateEvent<'info> {
        #[account(mut)]
        pub authority: Signer<'info>,

        #[account(
            init,
            payer = authority,
            space = 8 + Event::INIT_SPACE,
            seeds = [EVENT_SEED, authority.key().as_ref(), &id.to_le_bytes()],
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
            seeds = [EVENT_SEED, authority.key().as_ref(), &event.id.to_le_bytes()],
            bump = event.bump
        )]
        pub event: Account<'info, Event>,
    }

    #[derive(Accounts)]
    pub struct DeleteEvent<'info> {
        pub authority: Signer<'info>,

        #[account(
            mut,
            close = authority,
            has_one = authority,
            seeds = [EVENT_SEED, authority.key().as_ref(), &event.id.to_le_bytes()],
            bump = event.bump
        )]
        pub event: Account<'info, Event>,
    }
}

pub mod fns {
    use super::{ctx::*, *};
    use crate::{error::EventErr};

    pub fn create(
        ctx: Context<CreateEvent>,
        id: u64,
        title: String,
        content: String,
    ) -> Result<()> {
        require!(!title.trim().is_empty(), EventErr::Empty);
        require!(title.chars().count() <= 50, EventErr::TittleTooLong);
        require!(content.chars().count() <= 200, EventErr::ContentTooLong);

        let event = &mut ctx.accounts.event;
        event.authority = ctx.accounts.authority.key();
        event.id = id;
        event.title = title;
        event.content = content;
        event.bump = ctx.bumps.event;

        Ok(())
    }

    pub fn update(
        ctx: Context<UpdateEvent>,
        title: String,
        content: String,
    ) -> Result<()> {
        require!(!title.trim().is_empty(), EventErr::Empty);
        require!(title.chars().count() <= 50, EventErr::TittleTooLong);
        require!(content.chars().count() <= 200, EventErr::ContentTooLong);

        let event = &mut ctx.accounts.event;
        event.title = title;
        event.content = content;

        Ok(())
    }

    pub fn delete(_ctx: Context<DeleteEvent>) -> Result<()> {
        Ok(())
    }
}

pub use ctx::*;
