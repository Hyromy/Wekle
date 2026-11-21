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

    // ----------------
    //     CALENDAR
    // ----------------
    pub fn create_calendar(
        ctx: Context<CreateCalendar>,
        id: u64,
        name: String,
    ) -> Result<()> {
        instructions::calendar::fns::create(ctx, id, name)
    }

    // id is not necessary because the contexts gives de author
    pub fn update_calendar(
        ctx: Context<UpdateCalendar>,
        name: String,
    ) -> Result<()> {
        instructions::calendar::fns::update(ctx, name)
    }

    pub fn delete_calendar(ctx: Context<DeleteCalendar>) -> Result<()> {
        instructions::calendar::fns::delete(ctx)
    }

    // -------------
    //     EVENT
    // -------------
    pub fn create_event(
        ctx: Context<CreateEvent>,
        id: u64,
        title: String,
        content: String,
        start_at: i64,
        end_at: i64,
    ) -> Result<()> {
        instructions::event::fns::create(ctx, id, title, content, start_at, end_at)
    }

    pub fn update_event(
        ctx: Context<UpdateEvent>,
        title: String,
        content: String,
        start_at: i64,
        end_at: i64,
    ) -> Result<()> {
        instructions::event::fns::update(ctx, title, content, start_at, end_at)
    }

    pub fn delete_event(ctx: Context<DeleteEvent>) -> Result<()> {
        instructions::event::fns::delete(ctx)
    }
}
