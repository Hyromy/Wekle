/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/backend.json`.
 */
export type Backend = {
  "address": "28ckb9primXrZtbGpM2umYscwGskZGEmPnhKAfmuHW32",
  "metadata": {
    "name": "backend",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createCalendar",
      "discriminator": [
        140,
        70,
        1,
        99,
        123,
        36,
        66,
        161
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "calendar",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  108,
                  101,
                  110,
                  100,
                  97,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "arg",
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "id",
          "type": "u64"
        },
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "createEvent",
      "discriminator": [
        49,
        219,
        29,
        203,
        22,
        98,
        100,
        87
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "calendar"
          ]
        },
        {
          "name": "calendar"
        },
        {
          "name": "event",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  118,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "calendar"
              },
              {
                "kind": "arg",
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "id",
          "type": "u64"
        },
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "content",
          "type": "string"
        },
        {
          "name": "startAt",
          "type": "i64"
        },
        {
          "name": "endAt",
          "type": "i64"
        }
      ]
    },
    {
      "name": "deleteCalendar",
      "discriminator": [
        39,
        78,
        185,
        117,
        231,
        251,
        36,
        161
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "calendar"
          ]
        },
        {
          "name": "calendar",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  108,
                  101,
                  110,
                  100,
                  97,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "calendar.id",
                "account": "calendar"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "deleteEvent",
      "discriminator": [
        103,
        111,
        95,
        106,
        232,
        24,
        190,
        84
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "event"
          ]
        },
        {
          "name": "event",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  118,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "event.calendar",
                "account": "event"
              },
              {
                "kind": "account",
                "path": "event.id",
                "account": "event"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "updateCalendar",
      "discriminator": [
        19,
        106,
        66,
        18,
        236,
        228,
        197,
        31
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "calendar"
          ]
        },
        {
          "name": "calendar",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  97,
                  108,
                  101,
                  110,
                  100,
                  97,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "calendar.id",
                "account": "calendar"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "updateEvent",
      "discriminator": [
        70,
        108,
        211,
        125,
        171,
        176,
        25,
        217
      ],
      "accounts": [
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "event"
          ]
        },
        {
          "name": "event",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  118,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "event.calendar",
                "account": "event"
              },
              {
                "kind": "account",
                "path": "event.id",
                "account": "event"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "content",
          "type": "string"
        },
        {
          "name": "startAt",
          "type": "i64"
        },
        {
          "name": "endAt",
          "type": "i64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "calendar",
      "discriminator": [
        157,
        240,
        186,
        57,
        213,
        147,
        151,
        46
      ]
    },
    {
      "name": "event",
      "discriminator": [
        125,
        192,
        125,
        158,
        9,
        115,
        152,
        233
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "empty",
      "msg": "The event must be have a title"
    },
    {
      "code": 6001,
      "name": "tittleTooLong",
      "msg": "The event title is too long"
    },
    {
      "code": 6002,
      "name": "contentTooLong",
      "msg": "The event content is too long"
    },
    {
      "code": 6003,
      "name": "invalidTimeRange",
      "msg": "End time must be equal to or after start time"
    }
  ],
  "types": [
    {
      "name": "calendar",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "event",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "calendar",
            "type": "pubkey"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "content",
            "type": "string"
          },
          {
            "name": "startAt",
            "type": "i64"
          },
          {
            "name": "endAt",
            "type": "i64"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "calendarSeed",
      "type": "bytes",
      "value": "[99, 97, 108, 101, 110, 100, 97, 114]"
    },
    {
      "name": "eventSeed",
      "type": "bytes",
      "value": "[101, 118, 101, 110, 116]"
    }
  ]
};
