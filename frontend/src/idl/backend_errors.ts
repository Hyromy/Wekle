
export const BackendErrorCode = {
  Empty: 6000,
  TittleTooLong: 6001,
  ContentTooLong: 6002,
  InvalidTimeRange: 6003
};

export type BackendErrorName = keyof typeof BackendErrorCode;
