import json
from pathlib import Path
from src.build_report import player_root, load_units, ability_pair

def test_player_root_accepts_wrapped():
    assert player_root({"player":{"units":[]}}) == {"units":[]}

def test_player_root_accepts_unwrapped():
    assert player_root({"units":[]}) == {"units":[]}

def test_load_units_requires_array():
    try:
        load_units({})
        assert False, "expected ValueError"
    except ValueError:
        pass

def test_ability_pair():
    unit={"abilities":[{"id":"a","level":9},{"id":"p","level":10}]}
    active, passive=ability_pair(unit)
    assert active["level"] == 9
    assert passive["level"] == 10
