"""Tests MockIntentClassifier — BE-06."""

import pytest

from domain.services.intent_classifier import MockIntentClassifier


@pytest.fixture
def classifier() -> MockIntentClassifier:
    return MockIntentClassifier()


@pytest.mark.parametrize(
    ("text", "expected_intent"),
    [
        ("siguiente paso", "advance"),
        ("avanzar", "advance"),
        ("próximo", "advance"),
        ("repetir instrucción", "repeat"),
        ("otra vez", "repeat"),
        ("saltar este paso", "skip"),
        ("pausar sesión", "pause"),
        ("alto", "pause"),
        ("¿cuál es el torque?", "query"),
        ("por qué hay que cerrar la válvula", "query"),
        ("presión 85 psi", "measurement"),
        ("12.5 bar", "measurement"),
    ],
)
def test_keywords_map_to_intents(
    classifier: MockIntentClassifier,
    text: str,
    expected_intent: str,
) -> None:
    intent, confidence = classifier.classify(text)
    assert intent == expected_intent
    assert confidence >= 0.8


def test_narration_intent_for_descriptive_text(classifier: MockIntentClassifier) -> None:
    intent, confidence = classifier.classify("ya cerré la válvula V-12")
    assert intent == "narration"
    assert confidence >= 0.6


def test_finding_intent_for_anomaly_keywords(classifier: MockIntentClassifier) -> None:
    intent, confidence = classifier.classify("veo una fuga en la válvula")
    assert intent == "finding"
    assert confidence >= 0.8


def test_unknown_short_utterance(classifier: MockIntentClassifier) -> None:
    intent, confidence = classifier.classify("ok")
    assert intent == "unknown"
    assert confidence < 0.5
