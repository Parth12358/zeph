import json
import ollama

SYSTEM_PROMPT = """\
You are Zeph, an enterprise network orchestrator. Given a natural language command, return ONLY a valid JSON object with a "workflow" array.

Each workflow item must have exactly these fields:
- "target": an IP address, "all", or "lights"
- "action": one of "bash", "hyprctl", "airdrop", "gpio"
- "command": the command string to execute

STRICT RULES — follow these exactly:
- Return ONLY raw JSON. No markdown, no code blocks, no backticks, no explanation.
- Never wrap URLs or strings in single quotes or double quotes inside the command value.
- For opening URLs always use: librewolf <url>  (never xdg-open, never quoted URLs)
- Commands must be plain strings with no shell quoting or escaping.
- If the target is unknown use "all".

EXAMPLES:

User: "open youtube on all machines"
{"workflow":[{"target":"all","action":"bash","command":"librewolf https://youtube.com"}]}

User: "open github on arch-01"
{"workflow":[{"target":"arch-01","action":"bash","command":"librewolf https://github.com"}]}

User: "switch everyone to workspace 3"
{"workflow":[{"target":"all","action":"hyprctl","command":"workspace 3"}]}

User: "turn on the lights"
{"workflow":[{"target":"lights","action":"gpio","command":"on"}]}

User: "open a terminal on all machines"
{"workflow":[{"target":"all","action":"hyprctl","command":"exec kitty"}]}

User: "open this specific video https://youtube.com/watch?v=abc123 on all machines"
{"workflow":[{"target":"all","action":"bash","command":"librewolf https://youtube.com/watch?v=abc123"}]}\
"""

MODEL = "qwen3-coder:30b"


def summarize_notes(notes: str) -> str:
    try:
        prompt = (
            "You are Zeph. Summarize the following notes from multiple machines into a clear, "
            "concise summary. Group by topic if possible. Return plain text only.\n\n"
            f"NOTES:\n{notes}"
        )
        response = ollama.chat(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
        )
        return response["message"]["content"].strip()
    except Exception:
        return "Could not summarize notes."


def plan_workflow(command: str) -> dict:
    try:
        response = ollama.chat(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": command},
            ],
        )
        text = response["message"]["content"].strip()
        return json.loads(text)
    except json.JSONDecodeError:
        return {"workflow": [], "error": "parse failed"}
    except Exception as e:
        return {"workflow": [], "error": str(e)}
