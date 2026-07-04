"""Collector de métricas in-memory — BE-08."""

from __future__ import annotations

import asyncio
from collections import defaultdict
from dataclasses import dataclass, field


@dataclass
class Counter:
    """Contador monotónico."""

    name: str
    help_text: str
    labels: dict[str, str] = field(default_factory=dict)
    value: float = 0.0

    def inc(self, amount: float = 1.0) -> None:
        self.value += amount


@dataclass
class Histogram:
    """Histograma simple con suma y conteo."""

    name: str
    help_text: str
    labels: dict[str, str] = field(default_factory=dict)
    count: int = 0
    sum: float = 0.0
    buckets: dict[str, int] = field(default_factory=lambda: defaultdict(int))

    def observe(self, value: float) -> None:
        self.count += 1
        self.sum += value
        for bound in (0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0):
            if value <= bound:
                self.buckets[str(bound)] += 1


@dataclass
class Gauge:
    """Gauge mutable."""

    name: str
    help_text: str
    labels: dict[str, str] = field(default_factory=dict)
    value: float = 0.0

    def set(self, value: float) -> None:
        self.value = value


class InMemoryMetricsCollector:
    """Collector Prometheus-compatible en memoria."""

    _instance: InMemoryMetricsCollector | None = None

    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._counters: dict[str, Counter] = {}
        self._histograms: dict[str, Histogram] = {}
        self._gauges: dict[str, Gauge] = {}

    @classmethod
    def shared(cls) -> InMemoryMetricsCollector:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def reset_singleton(cls) -> None:
        cls._instance = None

    def counter(self, name: str, help_text: str, labels: dict[str, str] | None = None) -> Counter:
        key = self._key(name, labels or {})
        if key not in self._counters:
            self._counters[key] = Counter(name=name, help_text=help_text, labels=labels or {})
        return self._counters[key]

    def histogram(
        self,
        name: str,
        help_text: str,
        labels: dict[str, str] | None = None,
    ) -> Histogram:
        key = self._key(name, labels or {})
        if key not in self._histograms:
            self._histograms[key] = Histogram(name=name, help_text=help_text, labels=labels or {})
        return self._histograms[key]

    def gauge(self, name: str, help_text: str, labels: dict[str, str] | None = None) -> Gauge:
        key = self._key(name, labels or {})
        if key not in self._gauges:
            self._gauges[key] = Gauge(name=name, help_text=help_text, labels=labels or {})
        return self._gauges[key]

    def render_prometheus(self) -> str:
        """Serializa métricas a formato Prometheus text."""
        lines: list[str] = []

        seen_types: set[str] = set()
        for counter in self._counters.values():
            if counter.name not in seen_types:
                lines.append(f"# HELP {counter.name} {counter.help_text}")
                lines.append(f"# TYPE {counter.name} counter")
                seen_types.add(counter.name)
            label_str = self._format_labels(counter.labels)
            lines.append(f"{counter.name}{label_str} {counter.value}")

        seen_types.clear()
        for histogram in self._histograms.values():
            if histogram.name not in seen_types:
                lines.append(f"# HELP {histogram.name} {histogram.help_text}")
                lines.append(f"# TYPE {histogram.name} histogram")
                seen_types.add(histogram.name)
            label_str = self._format_labels(histogram.labels)
            for bound, count in sorted(histogram.buckets.items(), key=lambda x: float(x[0])):
                bucket_labels = {**histogram.labels, "le": bound}
                lines.append(
                    f"{histogram.name}_bucket{self._format_labels(bucket_labels)} {count}",
                )
            lines.append(f"{histogram.name}_sum{label_str} {histogram.sum}")
            lines.append(f"{histogram.name}_count{label_str} {histogram.count}")

        seen_types.clear()
        for gauge in self._gauges.values():
            if gauge.name not in seen_types:
                lines.append(f"# HELP {gauge.name} {gauge.help_text}")
                lines.append(f"# TYPE {gauge.name} gauge")
                seen_types.add(gauge.name)
            label_str = self._format_labels(gauge.labels)
            lines.append(f"{gauge.name}{label_str} {gauge.value}")

        return "\n".join(lines) + "\n"

    async def reset(self) -> None:
        async with self._lock:
            self._counters.clear()
            self._histograms.clear()
            self._gauges.clear()

    @staticmethod
    def _key(name: str, labels: dict[str, str]) -> str:
        parts = sorted(labels.items())
        return f"{name}|{parts!r}"

    @staticmethod
    def _format_labels(labels: dict[str, str]) -> str:
        if not labels:
            return ""
        parts = [f'{k}="{v}"' for k, v in sorted(labels.items())]
        return "{" + ",".join(parts) + "}"
