use anchor_lang::prelude::*;

// This file is like a Model from MVC

#[account]
#[derive(InitSpace)]
pub struct Event {
    pub id: u64,
    #[max_len(50)]
    pub title: String,
    #[max_len(200)]
    pub content: String,

    pub authority: Pubkey,
    pub bump: u8,
}
