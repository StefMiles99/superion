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


def test_unknown_utterance(classifier: MockIntentClassifier) -> None:
    intent, confidence = classifier.classify("hola mundo")
    assert intent == "unknown"
    assert confidence < 0.5
