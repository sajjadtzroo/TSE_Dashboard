"""
RAGAS evaluation harness for TSE Dashboard RAG pipeline.

Uses golden Q&A/context triples to measure:
  - Faithfulness > 0.85
  - Context Recall > 0.75
  - Answer Relevancy

Skip by default with: pytest -m "not eval"
Run explicitly with: pytest -m eval tests/eval/
"""
import json
import os
from pathlib import Path

import pytest

GOLDEN_QA_PATH = Path(__file__).parent / "golden_qa.json"

# Skip entire module if RAGAS is not installed or OPENAI key is missing
ragas = pytest.importorskip("ragas", reason="ragas package not installed")


@pytest.fixture(scope="module")
def golden_qa():
    """Load golden Q&A triples from JSON."""
    with open(GOLDEN_QA_PATH, encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture(scope="module")
def ragas_dataset(golden_qa):
    """Build a ragas EvaluationDataset from the golden Q&A triples."""
    from ragas import EvaluationDataset, SingleTurnSample

    samples = []
    for item in golden_qa:
        samples.append(
            SingleTurnSample(
                user_input=item["question"],
                response=item["answer"],
                retrieved_contexts=item["contexts"],
            )
        )
    return EvaluationDataset(samples=samples)


@pytest.mark.eval
@pytest.mark.skipif(
    not os.getenv("OPENAI_API_KEY") and not os.getenv("OPENROUTER_API_KEY"),
    reason="No LLM API key set — skipping RAGAS eval",
)
def test_ragas_faithfulness(ragas_dataset):
    """Faithfulness score should be > 0.85."""
    from ragas import evaluate
    from ragas.metrics import faithfulness

    result = evaluate(ragas_dataset, metrics=[faithfulness])
    score = result["faithfulness"]
    assert score > 0.85, f"Faithfulness {score:.3f} < 0.85 threshold"


@pytest.mark.eval
@pytest.mark.skipif(
    not os.getenv("OPENAI_API_KEY") and not os.getenv("OPENROUTER_API_KEY"),
    reason="No LLM API key set — skipping RAGAS eval",
)
def test_ragas_context_recall(ragas_dataset):
    """Context recall should be > 0.75."""
    from ragas import evaluate
    from ragas.metrics import context_recall

    result = evaluate(ragas_dataset, metrics=[context_recall])
    score = result["context_recall"]
    assert score > 0.75, f"Context recall {score:.3f} < 0.75 threshold"


@pytest.mark.eval
@pytest.mark.skipif(
    not os.getenv("OPENAI_API_KEY") and not os.getenv("OPENROUTER_API_KEY"),
    reason="No LLM API key set — skipping RAGAS eval",
)
def test_ragas_answer_relevancy(ragas_dataset):
    """Answer relevancy should be > 0.70."""
    from ragas import evaluate
    from ragas.metrics import answer_relevancy

    result = evaluate(ragas_dataset, metrics=[answer_relevancy])
    score = result["answer_relevancy"]
    assert score > 0.70, f"Answer relevancy {score:.3f} < 0.70 threshold"


@pytest.mark.eval
def test_golden_qa_format(golden_qa):
    """Sanity check: golden Q&A file has required fields and minimum count."""
    assert len(golden_qa) >= 20, f"Expected >= 20 golden triples, got {len(golden_qa)}"
    for i, item in enumerate(golden_qa):
        assert "question" in item, f"Item {i} missing 'question'"
        assert "answer" in item, f"Item {i} missing 'answer'"
        assert "contexts" in item, f"Item {i} missing 'contexts'"
        assert isinstance(item["contexts"], list), f"Item {i} 'contexts' must be a list"
        assert item["question"].strip(), f"Item {i} has empty question"
