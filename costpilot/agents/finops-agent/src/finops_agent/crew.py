from crewai import Agent, Task, Crew, Process
from costpilot_common.llm import get_llm
from finops_agent.tools.transaction_reconciler import find_unmatched_transactions, find_auto_reconcilable
from finops_agent.tools.variance_analyst import get_budget_variance
from finops_agent.tools.close_accelerator import get_reconciliation_status


def create_finops_crew() -> Crew:
    llm = get_llm()

    reconciler = Agent(
        role="Transaction Reconciler",
        goal="Match expected vs actual transactions and flag discrepancies.",
        backstory="You are a senior financial controller with zero tolerance for unmatched transactions.",
        tools=[find_unmatched_transactions, find_auto_reconcilable],
        llm=llm, verbose=True,
    )

    variance_analyst = Agent(
        role="Variance Analyst",
        goal="Compare budget vs actual with root-cause attribution.",
        backstory="You are a financial analyst who traces every dollar of variance to its source.",
        tools=[get_budget_variance],
        llm=llm, verbose=True,
    )

    close_accelerator = Agent(
        role="Close Accelerator",
        goal="Automate reconciliation steps to speed up financial close.",
        backstory="You are a process automation expert who cut close cycles from 10 days to 3.",
        tools=[find_auto_reconcilable, get_reconciliation_status],
        llm=llm, verbose=True,
    )

    reconcile_task = Task(
        description="Find all unmatched transactions. Identify discrepancies between invoices and POs. Report each with variance amount.",
        expected_output="JSON list of discrepancies with invoice_id, vendor, variance_amount, description.",
        agent=reconciler,
    )

    variance_task = Task(
        description="Analyze budget vs actual for all departments. Identify top variances and attribute root causes.",
        expected_output="JSON list of variances with department, category, variance_amount, variance_pct, root_cause.",
        agent=variance_analyst,
    )

    accelerate_task = Task(
        description="Identify transactions that can be auto-reconciled. Calculate time savings from automation.",
        expected_output="JSON with auto_reconcilable_count, total_amount, estimated_days_saved.",
        agent=close_accelerator,
    )

    return Crew(
        agents=[reconciler, variance_analyst, close_accelerator],
        tasks=[reconcile_task, variance_task, accelerate_task],
        process=Process.sequential, verbose=True,
    )
