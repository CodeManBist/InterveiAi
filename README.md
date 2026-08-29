                    ┌──────────────────┐
                    │     Backend      │
                    │                  │
                    │ GEMINI_API_KEY   │
                    └────────┬─────────┘
                             │
                    create ephemeral token
                             │
                             ▼
┌──────────────┐       token       ┌────────────────────┐
│    React     │ ─────────────────► │   Gemini Live API  │
│   Browser    │ ◄───────────────── │                    │
└──────────────┘   audio / events   └────────────────────┘
       │
       │ microphone
       ▼
     User