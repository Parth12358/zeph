# Zeph Client — Command Whitelist
# Edit this file to add or remove allowed commands.
# Do not modify agent.py to change permissions.

# Allowed hyprctl dispatch subcommands (first word of the command)
HYPRCTL_DISPATCH = {
    "workspace",
    "exec",
    "movetoworkspace",
    "togglefloating",
    "fullscreen",
}

# Allowed bash command prefixes
BASH_PREFIXES = {
    "librewolf",
    "xdg-open",
}
