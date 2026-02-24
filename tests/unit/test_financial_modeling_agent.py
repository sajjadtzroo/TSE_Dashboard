# tests/unit/test_financial_modeling_agent.py
"""Tests for financial modeling agent and router registration."""
import pytest


class TestFinancialModelingAgent:
    def test_config_name(self):
        from rag.agents.financial_modeling import build_config
        config = build_config()
        assert config.name == "financial_modeling"

    def test_temperature_lte_03(self):
        from rag.agents.financial_modeling import build_config
        config = build_config()
        assert config.temperature <= 0.3

    def test_twenty_tools(self):
        from rag.agents.financial_modeling import build_config
        config = build_config()
        assert len(config.tool_definitions) == 20

    def test_tool_names(self):
        from rag.agents.financial_modeling import build_config
        config = build_config()
        names = {d["function"]["name"] for d in config.tool_definitions}
        assert names == {
            "build_dcf_model", "build_pl_model", "build_loan_amortization", "build_bond_model",
            "compute_wacc", "compute_capm", "build_ddm_model",
            "build_residual_income_model", "build_multiples_model", "compute_fcfe",
            "build_revenue_model", "build_wc_model", "build_capex_schedule", "build_debt_schedule",
            "build_three_statement_model",
            "compute_beta", "build_scenario_model", "compute_operating_leverage",
            "compute_pvgo", "compute_eva",
        }

    def test_max_tool_rounds(self):
        from rag.agents.financial_modeling import build_config
        config = build_config()
        assert config.max_tool_rounds == 8

    def test_max_tokens(self):
        from rag.agents.financial_modeling import build_config
        config = build_config()
        assert config.max_tokens == 3000


class TestAgentRegistry:
    def test_enum_value_exists(self):
        from rag.agents.router import AgentIntent
        assert AgentIntent.FINANCIAL_MODELING == "financial_modeling"

    def test_get_agent_returns_financial_modeling(self):
        # Clear functools cache before test
        from rag.agents import get_agent
        get_agent.cache_clear()
        agent = get_agent("financial_modeling")
        assert agent.config.name == "financial_modeling"

    def test_keyword_boost_dcf_model(self):
        from rag.agents.router import _keyword_boost
        intent, confidence = _keyword_boost("build dcf model for this company", "general", 0.3)
        assert intent == "financial_modeling"

    def test_keyword_boost_persian(self):
        from rag.agents.router import _keyword_boost
        intent, confidence = _keyword_boost("مدل مالی برای شرکت بسازید", "general", 0.3)
        assert intent == "financial_modeling"

    def test_keyword_boost_amortization(self):
        from rag.agents.router import _keyword_boost
        intent, confidence = _keyword_boost("loan amortization schedule for 100M at 18%", "general", 0.3)
        assert intent == "financial_modeling"

    def test_keyword_boost_high_confidence_not_overridden(self):
        """High confidence classification should not be overridden by keyword boost."""
        from rag.agents.router import _keyword_boost
        # If confidence >= 0.7 for a different intent, don't override
        intent, confidence = _keyword_boost("build dcf model", "market_data", 0.9)
        assert intent == "market_data"


class TestToolsRegistry:
    _ALL_FM_TOOLS = [
        "build_dcf_model", "build_pl_model", "build_loan_amortization", "build_bond_model",
        "compute_wacc", "compute_capm", "build_ddm_model",
        "build_residual_income_model", "build_multiples_model", "compute_fcfe",
        "build_revenue_model", "build_wc_model", "build_capex_schedule", "build_debt_schedule",
        "build_three_statement_model",
        "compute_beta", "build_scenario_model", "compute_operating_leverage",
        "compute_pvgo", "compute_eva",
    ]

    def test_fm_tools_in_all_definitions(self):
        from rag.tools import ALL_TOOL_DEFINITIONS
        names = {d["function"]["name"] for d in ALL_TOOL_DEFINITIONS}
        for tool_name in self._ALL_FM_TOOLS:
            assert tool_name in names

    def test_fm_tools_in_all_dispatch(self):
        from rag.tools import ALL_TOOL_DISPATCH
        for tool_name in self._ALL_FM_TOOLS:
            assert tool_name in ALL_TOOL_DISPATCH
