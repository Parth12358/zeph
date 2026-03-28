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

MODEL = "llama3"


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
