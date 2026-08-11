from dataclasses import dataclass


@dataclass
class TestCase:
    """Represents a single test case with its core attributes."""

    test_case_id: str
    title: str
    description: str
    expected_result: str
    test_data: str