"""Reglas de negocio puras (sin red ni base de datos), para poder probarlas solas.

Regla de atestación: 7 días CONSECUTIVOS en los que la vaca fue observada lo suficiente y no tuvo
alertas de aislamiento (`isolated_animal`) ni eventos críticos. Un día sin observación suficiente
corta la racha: no ver una alerta no es lo mismo que no haberla.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from typing import Iterable, List, Optional, Tuple

WINDOW_DAYS = 7


@dataclass(frozen=True)
class DailyObservation:
    day: date
    observed_sec: float
    isolated_events: int
    critical_events: int


@dataclass(frozen=True)
class Decision:
    window: Optional[Tuple[date, date]]   # (primer día, último día) de la racha que se atestigua
    clean_streak_days: int
    reason: str


def _merge(observations: Iterable[DailyObservation]) -> dict:
    by_day: dict = {}
    for o in observations:
        prev = by_day.get(o.day)
        if prev is None:
            by_day[o.day] = o
        else:
            by_day[o.day] = DailyObservation(o.day, prev.observed_sec + o.observed_sec,
                                             prev.isolated_events + o.isolated_events,
                                             prev.critical_events + o.critical_events)
    return by_day


def evaluate(observations: Iterable[DailyObservation], min_observed_sec: float,
             already_attested_until: Optional[date] = None) -> Decision:
    """Busca la racha limpia más reciente de 7 días que todavía no se haya atestiguado."""
    by_day = _merge(observations)
    if not by_day:
        return Decision(None, 0, "Sin observaciones.")
    days: List[date] = sorted(by_day)
    streak: List[date] = []
    best: Optional[Tuple[date, date]] = None
    for d in days:
        o = by_day[d]
        clean = o.observed_sec >= min_observed_sec and o.isolated_events == 0 and o.critical_events == 0
        if clean and streak and d == streak[-1] + timedelta(days=1):
            streak.append(d)
        elif clean:
            streak = [d]
        else:
            streak = []
        if len(streak) >= WINDOW_DAYS:
            best = (streak[-WINDOW_DAYS], streak[-1])
    last = by_day[days[-1]]
    current = len(streak)
    if best is None:
        why = ("El último día tuvo alertas." if (last.isolated_events or last.critical_events)
               else "Observación insuficiente el último día." if last.observed_sec < min_observed_sec
               else f"Racha limpia de {current} de {WINDOW_DAYS} días.")
        return Decision(None, current, why)
    if already_attested_until is not None and best[1] <= already_attested_until:
        return Decision(None, current, "La racha ya estaba atestiguada.")
    return Decision(best, current, f"{WINDOW_DAYS} días seguidos sin alertas.")
