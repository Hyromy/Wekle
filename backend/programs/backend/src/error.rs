use anchor_lang::prelude::*;

// Just an enums of personalized Exceptions

#[error_code]
pub enum EventErr {
    #[msg("The event must be have a title")]
    Empty,
    
    #[msg("The event title is too long")]
    TittleTooLong,
    
    #[msg("The event content is too long")]
    ContentTooLong,
}
