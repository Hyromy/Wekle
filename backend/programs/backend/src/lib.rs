pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use instructions::*;

declare_id!("28ckb9primXrZtbGpM2umYscwGskZGEmPnhKAfmuHW32");

#[program]
pub mod backend {
    use super::*;
    
    // This section declares the "endpoints"

    pub fn create_event(
        ctx: Context<CreateEvent>,
        id: u64,
        title: String,
        content: String,
    ) -> Result<()> {
        instructions::event::fns::create(ctx, id, title, content)
    }

    // id is not necessary because the contexts gives de author
    pub fn update_event(
        ctx: Context<UpdateEvent>,
        title: String,
        content: String,
    ) -> Result<()> {
        instructions::event::fns::update(ctx, title, content)
    }

    pub fn delete_event(ctx: Context<DeleteEvent>) -> Result<()> {
        instructions::event::fns::delete(ctx)
    }
}
