# sport_config.py
# Central configuration for all supported sports.
# To add a new sport: add a new key to SPORT_CONFIG with the same structure.

SPORT_CONFIG = {
    "football": {
        "display_name": "Football",
        "color": "#16a34a",
        "events": [
            {"key": "goal",        "label": "Goal",          "scoring": True,  "value": 1,  "own_goal": False},
            {"key": "own_goal",    "label": "Own Goal",      "scoring": True,  "value": 1,  "own_goal": True},
            {"key": "penalty",     "label": "Penalty Goal",  "scoring": True,  "value": 1,  "own_goal": False},
            {"key": "yellow_card", "label": "Yellow Card",   "scoring": False, "value": 0,  "own_goal": False},
            {"key": "red_card",    "label": "Red Card",      "scoring": False, "value": 0,  "own_goal": False},
            {"key": "substitution","label": "Substitution",  "scoring": False, "value": 0,  "own_goal": False},
            {"key": "injury",      "label": "Injury",        "scoring": False, "value": 0,  "own_goal": False},
        ],
    },
    "basketball": {
        "display_name": "Basketball",
        "color": "#ea580c",
        "events": [
            {"key": "3pt",     "label": "3-Point Shot",   "scoring": True,  "value": 3, "own_goal": False},
            {"key": "2pt",     "label": "2-Point Shot",   "scoring": True,  "value": 2, "own_goal": False},
            {"key": "1pt",     "label": "Free Throw",     "scoring": True,  "value": 1, "own_goal": False},
            {"key": "foul",    "label": "Foul",           "scoring": False, "value": 0, "own_goal": False},
            {"key": "timeout", "label": "Timeout",        "scoring": False, "value": 0, "own_goal": False},
            {"key": "block",   "label": "Block",          "scoring": False, "value": 0, "own_goal": False},
        ],
    },
    "volleyball": {
        "display_name": "Volleyball",
        "color": "#7c3aed",
        "events": [
            {"key": "point",   "label": "Point",          "scoring": True,  "value": 1, "own_goal": False},
            {"key": "ace",     "label": "Ace",            "scoring": True,  "value": 1, "own_goal": False},
            {"key": "error",   "label": "Opponent Error", "scoring": True,  "value": 1, "own_goal": False},
            {"key": "set_win", "label": "Set Won",        "scoring": False, "value": 0, "own_goal": False},
            {"key": "timeout", "label": "Timeout",        "scoring": False, "value": 0, "own_goal": False},
        ],
    },
    "tennis": {
        "display_name": "Tennis",
        "color": "#ca8a04",
        "events": [
            {"key": "game_win",      "label": "Game Won",      "scoring": True,  "value": 1, "own_goal": False},
            {"key": "set_win",       "label": "Set Won",        "scoring": False, "value": 0, "own_goal": False},
            {"key": "ace",           "label": "Ace",            "scoring": False, "value": 0, "own_goal": False},
            {"key": "double_fault",  "label": "Double Fault",   "scoring": False, "value": 0, "own_goal": False},
            {"key": "break_point",   "label": "Break Point",    "scoring": False, "value": 0, "own_goal": False},
        ],
    },
    "badminton": {
        "display_name": "Badminton",
        "color": "#0891b2",
        "events": [
            {"key": "point",   "label": "Point",          "scoring": True,  "value": 1, "own_goal": False},
            {"key": "ace",     "label": "Smash Point",    "scoring": True,  "value": 1, "own_goal": False},
            {"key": "error",   "label": "Opponent Error", "scoring": True,  "value": 1, "own_goal": False},
            {"key": "set_win", "label": "Set Won",        "scoring": False, "value": 0, "own_goal": False},
        ],
    },
}


def get_sport_config(sport_type: str) -> dict | None:
    return SPORT_CONFIG.get(sport_type)


def get_all_sports() -> dict:
    return {k: {"display_name": v["display_name"], "color": v["color"]} for k, v in SPORT_CONFIG.items()}


def get_event_value(sport_type: str, event_key: str) -> int:
    config = SPORT_CONFIG.get(sport_type, {})
    for event in config.get("events", []):
        if event["key"] == event_key:
            return event["value"]
    return 0


def is_own_goal_event(sport_type: str, event_key: str) -> bool:
    config = SPORT_CONFIG.get(sport_type, {})
    for event in config.get("events", []):
        if event["key"] == event_key:
            return event.get("own_goal", False)
    return False
