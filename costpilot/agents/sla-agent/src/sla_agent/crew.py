from crewai import Agent, Task, Crew, Process
from costpilot_common.llm import get_llm
from sla_agent.tools.sla_monitor import get_sla_metrics, get_sla_trend
from sla_agent.tools.breach_predictor import predict_sla_breaches
from sla_agent.tools.escalation_manager import get_team_capacity, get_penalty_schedule


def create_sla_crew() -> Crew:
    llm = get_llm()

    sla_monitor = Agent(
        role="SLA Monitor",
        goal="Track service metrics against SLA thresholds and identify services at risk.",
        backstory="You are a vigilant operations analyst who monitors service health 24/7.",
        tools=[get_sla_metrics, get_sla_trend],
        llm=llm,
        verbose=True,
    )

    breach_predictor = Agent(
        role="Breach Predictor",
        goal="Use trend analysis to predict SLA breaches before they happen.",
        backstory="You are a predictive analytics expert who spots degradation patterns early.",
        tools=[predict_sla_breaches],
        llm=llm,
        verbose=True,
    )

    escalation_manager = Agent(
        role="Escalation Manager",
        goal="Recommend resource shifts, work rerouting, or escalations to prevent SLA penalties.",
        backstory="You are a crisis management expert who prevents financial damage through quick action.",
        tools=[get_team_capacity, get_penalty_schedule],
        llm=llm,
        verbose=True,
    )

    monitor_task = Task(
        description="Check current SLA metrics for all services. Identify any services below or approaching their targets. Report current compliance status.",
        expected_output="JSON list of services with current metrics, target, and compliance status.",
        agent=sla_monitor,
    )

    predict_task = Task(
        description="Analyze trends to predict which services will breach SLA in the next 24 hours. Estimate time to breach and penalty amount at stake.",
        expected_output="JSON list of at-risk services with predicted_breach_in_hours, penalty_amount, and confidence.",
        agent=breach_predictor,
    )

    escalation_task = Task(
        description="For services at risk of breach, recommend specific actions: resource reallocation, team shifts, or escalations. Calculate cost of action vs cost of breach.",
        expected_output="JSON list of recommendations with service, action, cost_of_action, penalty_avoided, and net_savings.",
        agent=escalation_manager,
    )

    return Crew(
        agents=[sla_monitor, breach_predictor, escalation_manager],
        tasks=[monitor_task, predict_task, escalation_task],
        process=Process.sequential,
        verbose=True,
    )
