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
    "git",
    "cd",
}

MULTI_ALLOWED = {
    # existing
    "librewolf", "kitty", "alacritty", "nano", "code-oss", "xdg-open",
    # editors
    "hx",
    # TUI tools (auto wrapped in alacritty)
    "btop", "lazygit", "lazydocker", "yazi", "zellij", "pgcli", "taskwarrior", "opencode",
    # GUI
    "mpv", "wayvnc", "wlogout", "pdfpc", "grim",
}
