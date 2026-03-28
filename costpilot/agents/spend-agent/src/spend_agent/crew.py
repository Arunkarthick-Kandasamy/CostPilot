from crewai import Agent, Task, Crew, Process
from costpilot_common.llm import get_llm
from spend_agent.tools.anomaly_detector import query_purchase_orders, get_price_statistics
from spend_agent.tools.duplicate_finder import find_duplicate_invoices, find_overlapping_contracts
from spend_agent.tools.rate_optimizer import compare_vendor_rates


def create_spend_crew() -> Crew:
    llm = get_llm()

    anomaly_detector = Agent(
        role="Procurement Anomaly Detector",
        goal="Scan purchase orders and vendor invoices to identify unusual patterns including price spikes, volume anomalies, and seasonal deviations.",
        backstory="You are a forensic financial analyst with 15 years of experience detecting procurement fraud and waste.",
        tools=[query_purchase_orders, get_price_statistics],
        llm=llm,
        verbose=True,
    )

    duplicate_finder = Agent(
        role="Duplicate Cost Investigator",
        goal="Identify duplicate invoices, overlapping vendor contracts, and redundant subscriptions.",
        backstory="You are a meticulous auditor who has saved companies millions by finding duplicate charges.",
        tools=[find_duplicate_invoices, find_overlapping_contracts],
        llm=llm,
        verbose=True,
    )

    rate_optimizer = Agent(
        role="Vendor Rate Optimizer",
        goal="Compare vendor rates against market benchmarks and identify renegotiation opportunities.",
        backstory="You are a strategic procurement advisor who knows market rates across industries.",
        tools=[compare_vendor_rates],
        llm=llm,
        verbose=True,
    )

    detect_anomalies = Task(
        description="Analyze procurement data for anomalies. Query purchase orders, find price spikes (>15% above avg), volume anomalies (2x normal), and seasonal deviations. Report each with financial impact.",
        expected_output="JSON list of anomalies with vendor_id, description, financial_impact, confidence, evidence.",
        agent=anomaly_detector,
    )

    find_duplicates = Task(
        description="Search for duplicate invoices, overlapping contracts, and redundant subscriptions. Report each with wasted amount.",
        expected_output="JSON list of duplicates with type, vendor_id, amount, description, confidence.",
        agent=duplicate_finder,
    )

    optimize_rates = Task(
        description="Compare vendor rates against benchmarks. Calculate potential savings from renegotiation. Prioritize by savings opportunity.",
        expected_output="JSON list of opportunities with vendor_id, current_rate, market_rate, annual_savings, priority.",
        agent=rate_optimizer,
    )

    return Crew(
        agents=[anomaly_detector, duplicate_finder, rate_optimizer],
        tasks=[detect_anomalies, find_duplicates, optimize_rates],
        process=Process.sequential,
        verbose=True,
    )
