use anchor_lang::prelude::*;

// Just an enums of personalized Exceptions

#[error_code]
pub enum Err {
    #[msg("The event must be have a title")]
    Empty,
    
    #[msg("The event title is too long")]
    TittleTooLong,
    
    #[msg("The event content is too long")]
    ContentTooLong,

    #[msg("End time must be equal to or after start time")]
    InvalidTimeRange,
}
