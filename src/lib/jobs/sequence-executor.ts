import { db } from "@/lib/db";

export interface ExecutionResult {
  status: "completed" | "skipped" | "waiting";
  message: string;
  actionId?: string;
}

export async function executeSequenceStep(
  sequenceId: string,
  leadId: string
): Promise<ExecutionResult> {
  // Get enrollment
  const enrollment = await db.sequenceEnrollment.findUnique({
    where: {
      sequenceId_leadId: { sequenceId, leadId },
    },
    include: {
      sequence: {
        include: {
          steps: { orderBy: { order: "asc" } },
          project: { include: { plans: { take: 1 } } },
        },
      },
      lead: true,
    },
  });

  if (!enrollment) {
    return { status: "skipped", message: "Enrollment not found" };
  }

  if (enrollment.status !== "active") {
    return { status: "skipped", message: `Enrollment status: ${enrollment.status}` };
  }

  // Get current step
  const currentStepIndex = enrollment.currentStep - 1;
  const currentStep = enrollment.sequence.steps[currentStepIndex];

  if (!currentStep) {
    // Sequence completed
    await db.sequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });
    return { status: "completed", message: "Sequence completed" };
  }

  // Execute step based on type
  let result: ExecutionResult;

  switch (currentStep.type) {
    case "email":
      result = await executeEmailStep(enrollment, currentStep);
      break;
    case "wait":
      result = await executeWaitStep(enrollment, currentStep);
      break;
    case "condition":
      result = await executeConditionStep(enrollment, currentStep);
      break;
    case "task":
      result = await executeTaskStep(enrollment, currentStep);
      break;
    default:
      result = { status: "skipped", message: `Unknown step type: ${currentStep.type}` };
  }

  // Record step execution
  await db.stepExecution.create({
    data: {
      enrollmentId: enrollment.id,
      stepId: currentStep.id,
      status: result.status,
      executedAt: new Date(),
      result: JSON.stringify(result),
    },
  });

  // If step was completed (not waiting), advance to next step
  if (result.status === "completed" || result.status === "skipped") {
    await advanceToNextStep(enrollment.id, enrollment.sequence.steps, currentStepIndex);
  }

  return result;
}

async function executeEmailStep(
  enrollment: {
    id: string;
    lead: { id: string; name: string; email: string | null };
    sequence: {
      project: { id: string; plans: { id: string }[] };
    };
  },
  step: { id: string; subject: string | null; body: string | null; templateId: string | null }
): Promise<ExecutionResult> {
  // Check if lead has email
  if (!enrollment.lead.email) {
    return { status: "skipped", message: "Lead has no email address" };
  }

  // Get subject and body from step or template
  let subject = step.subject;
  let body = step.body;

  if (step.templateId) {
    const template = await db.emailTemplate.findUnique({
      where: { id: step.templateId },
    });
    if (template) {
      subject = template.subject;
      body = template.body;
    }
  }

  if (!subject || !body) {
    return { status: "skipped", message: "No email content configured" };
  }

  // Replace variables in subject and body
  subject = replaceVariables(subject, enrollment.lead);
  body = replaceVariables(body, enrollment.lead);

  // Get plan (use first plan in project if available)
  const planId = enrollment.sequence.project.plans[0]?.id;

  if (!planId) {
    return { status: "skipped", message: "No plan available in project" };
  }

  // Create action (email draft)
  const action = await db.action.create({
    data: {
      type: "email",
      status: "ready",
      subject,
      body,
      leadId: enrollment.lead.id,
      planId,
      reasoning: JSON.stringify({ source: "sequence", stepId: step.id }),
    },
  });

  return {
    status: "completed",
    message: "Email action created",
    actionId: action.id,
  };
}

async function executeWaitStep(
  enrollment: { id: string },
  step: { delayDays: number | null; delayHours: number | null }
): Promise<ExecutionResult> {
  // Wait steps just mark as complete and schedule the next step
  const nextStepAt = new Date();

  if (step.delayDays) {
    nextStepAt.setDate(nextStepAt.getDate() + step.delayDays);
  }
  if (step.delayHours) {
    nextStepAt.setHours(nextStepAt.getHours() + step.delayHours);
  }

  await db.sequenceEnrollment.update({
    where: { id: enrollment.id },
    data: { nextStepAt },
  });

  return { status: "completed", message: `Waiting until ${nextStepAt.toISOString()}` };
}

async function executeConditionStep(
  enrollment: {
    id: string;
    lead: { status: string };
  },
  step: { condition: string | null }
): Promise<ExecutionResult> {
  if (!step.condition) {
    return { status: "completed", message: "No condition configured" };
  }

  try {
    const condition = JSON.parse(step.condition) as {
      field: string;
      operator: string;
      value: string;
    };

    // Simple condition evaluation
    let fieldValue: string | undefined;

    switch (condition.field) {
      case "status":
        fieldValue = enrollment.lead.status;
        break;
      default:
        fieldValue = undefined;
    }

    let passed = false;

    switch (condition.operator) {
      case "equals":
        passed = fieldValue === condition.value;
        break;
      case "not_equals":
        passed = fieldValue !== condition.value;
        break;
      case "contains":
        passed = fieldValue?.includes(condition.value) ?? false;
        break;
      default:
        passed = true;
    }

    if (!passed) {
      // Exit sequence if condition not met
      await db.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: "exited",
                  },
      });
      return { status: "skipped", message: "Condition not met, exiting sequence" };
    }

    return { status: "completed", message: "Condition passed" };
  } catch {
    return { status: "skipped", message: "Invalid condition format" };
  }
}

async function executeTaskStep(
  enrollment: { id: string; lead: { name: string } },
  step: { body: string | null }
): Promise<ExecutionResult> {
  // Task steps create a reminder/note (future: could integrate with task management)
  console.log(`Task for ${enrollment.lead.name}: ${step.body || "No description"}`);

  return { status: "completed", message: "Task logged" };
}

async function advanceToNextStep(
  enrollmentId: string,
  steps: { id: string; type: string; delayDays: number | null; delayHours: number | null }[],
  currentIndex: number
): Promise<void> {
  const nextIndex = currentIndex + 1;

  if (nextIndex >= steps.length) {
    // Sequence completed
    await db.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: "completed",
        completedAt: new Date(),
        currentStep: nextIndex + 1,
      },
    });
    return;
  }

  const nextStep = steps[nextIndex];
  let nextStepAt = new Date();

  // If next step is a wait, calculate the delay
  if (nextStep.type === "wait") {
    if (nextStep.delayDays) {
      nextStepAt.setDate(nextStepAt.getDate() + nextStep.delayDays);
    }
    if (nextStep.delayHours) {
      nextStepAt.setHours(nextStepAt.getHours() + nextStep.delayHours);
    }
  }

  // Update enrollment and schedule next job
  await db.sequenceEnrollment.update({
    where: { id: enrollmentId },
    data: {
      currentStep: nextIndex + 1,
      nextStepAt,
    },
  });

  // Get enrollment to get sequenceId and leadId
  const enrollment = await db.sequenceEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { sequenceId: true, leadId: true },
  });

  if (enrollment) {
    await db.scheduledJob.create({
      data: {
        type: "sequence_step",
        scheduledFor: nextStepAt,
        payload: JSON.stringify({
          sequenceId: enrollment.sequenceId,
          leadId: enrollment.leadId,
        }),
      },
    });
  }
}

function replaceVariables(
  text: string,
  lead: { name: string; email: string | null; [key: string]: unknown }
): string {
  return text
    .replace(/\{\{name\}\}/gi, lead.name || "")
    .replace(/\{\{email\}\}/gi, lead.email || "")
    .replace(/\{\{company\}\}/gi, String(lead.organization || ""))
    .replace(/\{\{role\}\}/gi, String(lead.role || ""))
    .replace(/\{\{notes\}\}/gi, String(lead.notes || ""));
}
