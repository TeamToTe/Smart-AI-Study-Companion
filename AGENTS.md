## Tech Stack & Build
- **Stack**: Python 3.11, FastAPI

## Hard Behavioral Rules
- **Think Before Coding**: You must explicitly state your assumptions and surface architectural tradeoffs before writing any code.
- **Halt on Ambiguity**: Stop and ask the user for clarification the moment you encounter ambiguous requirements; do not guess silently.
- **Surgical Edits Only**: Write the absolute minimum amount of code required to solve the immediate problem, strictly avoiding unrequested abstractions or speculative features.
- **Test-Driven Execution**: Break tasks into a step-by-step plan and always write a reproducing or failing test first before looping through verification.

## Available Agent Skills (Router)
*Do not execute these workflows directly from this file. Load the specific skill from the `skills/` directory on demand:* [1]
- `pydantic_and_fastapi_design`: Use when writing APIs and design pydantic model for request/response.