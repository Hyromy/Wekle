use anchor_lang::prelude::*;

// This file is like a Model from MVC

#[account]
#[derive(InitSpace)]
pub struct Calendar {
    pub id: u64,
    #[max_len(50)]
    pub name: String,

    pub authority: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Event {
    pub id: u64,
    pub calendar: Pubkey,
    #[max_len(50)]
    pub title: String,
    #[max_len(200)]
    pub content: String,
    pub start_at: i64,
    pub end_at: i64,

    pub authority: Pubkey,
    pub bump: u8,
}
