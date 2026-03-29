import json
import ollama

SYSTEM_PROMPT = (
    "You are Zeph, an enterprise network orchestrator. "
    "Given a natural language command, return ONLY a JSON object with a \"workflow\" array. "
    "Each item has: target (ip or \"all\" or \"lights\"), "
    "action (\"bash\", \"hyprctl\", \"airdrop\", \"gpio\"), "
    "command (string). "
    "No explanation, no markdown, only JSON."
)

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
