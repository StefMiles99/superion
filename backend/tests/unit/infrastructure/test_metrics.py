"""Tests unitarios de métricas — BE-08."""

import pytest

from infrastructure.observability.metrics import InMemoryMetricsCollector


@pytest.fixture
def collector() -> InMemoryMetricsCollector:
    InMemoryMetricsCollector.reset_singleton()
    return InMemoryMetricsCollector.shared()


def test_counter_increments(collector: InMemoryMetricsCollector) -> None:
    counter = collector.counter("http_requests_total", "Total HTTP requests")
    counter.inc()
    counter.inc(2)

    output = collector.render_prometheus()
    assert "http_requests_total 3" in output
    assert "# TYPE http_requests_total counter" in output


def test_histogram_observes_values(collector: InMemoryMetricsCollector) -> None:
    histogram = collector.histogram("request_duration_seconds", "Request duration")
    histogram.observe(0.05)
    histogram.observe(0.15)

    output = collector.render_prometheus()
    assert "# TYPE request_duration_seconds histogram" in output
    assert "request_duration_seconds_count" in output
    assert "request_duration_seconds_sum" in output


def test_gauge_set(collector: InMemoryMetricsCollector) -> None:
    gauge = collector.gauge("active_connections", "Active connections")
    gauge.set(5)

    output = collector.render_prometheus()
    assert "active_connections 5" in output
    assert "# TYPE active_connections gauge" in output
