import { Router } from "express";
import { openai, chatModel } from "@workspace/integrations-openai-ai-server";
import {
  GenerateCatchupPlanBody,
  GenerateTeacherEmailBody,
  SimplifyAssignmentBody,
  GetAccommodationRecsBody,
  GenerateCatchupPlanResponse,
  GenerateTeacherEmailResponse,
  SimplifyAssignmentResponse,
  GetAccommodationRecsResponse,
} from "@workspace/api-zod";

const router = Router();

router.post("/ai/catchup-plan", async (req, res): Promise<void> => {
  const parsed = GenerateCatchupPlanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { daysAbsent, classesMissed, assignments, upcomingTests, energyLevel, availableHoursPerDay } = parsed.data;

  const prompt = `You are a compassionate academic advisor helping a chronically ill student catch up after missing school.

Student info:
- Days absent: ${daysAbsent}
- Classes missed: ${(classesMissed ?? []).join(", ") || "unknown"}
- Assignments to catch up on: ${(assignments ?? []).join(", ") || "none listed"}
- Upcoming tests: ${(upcomingTests ?? []).join(", ") || "none listed"}
- Energy level today (1-10): ${energyLevel}
- Available study hours per day: ${availableHoursPerDay}

Create a realistic, compassionate catch-up plan. Be mindful of their energy level — if it's low (1-4), recommend lighter sessions with rest breaks. 
Respond ONLY with valid JSON matching this exact structure:
{
  "schedule": [
    {"day": "Day 1", "tasks": ["task1", "task2"], "estimatedHours": 1.5, "restReminder": "Take a 15-min break between tasks"}
  ],
  "dailyGoals": ["goal1", "goal2"],
  "prioritizedAssignments": ["assignment1", "assignment2"],
  "totalEstimatedHours": 5,
  "encouragement": "You've got this! Take it one step at a time."
}`;

  const completion = await openai.chat.completions.create({
    model: chatModel,
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const plan = JSON.parse(content);
  res.json(GenerateCatchupPlanResponse.parse(plan));
});

router.post("/ai/teacher-email", async (req, res): Promise<void> => {
  const parsed = GenerateTeacherEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { teacherName, className, reasonForAbsence, accommodationsNeeded, assignmentsMissed } = parsed.data;

  const prompt = `Write a professional, respectful email from a student to their teacher. The student has a chronic illness and missed class.

Details:
- Teacher: ${teacherName}
- Class: ${className}
- Reason for absence: ${reasonForAbsence}
- Accommodations needed: ${(accommodationsNeeded ?? []).join(", ") || "none specified"}
- Assignments missed: ${(assignmentsMissed ?? []).join(", ") || "none listed"}

Write a warm, professional email that:
1. Opens politely
2. Briefly explains the absence (without oversharing medical details)
3. Asks about missed work
4. Mentions any accommodations needed
5. Closes professionally

Respond ONLY with valid JSON:
{"subject": "email subject here", "body": "full email body here"}`;

  const completion = await openai.chat.completions.create({
    model: chatModel,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const email = JSON.parse(content);
  res.json(GenerateTeacherEmailResponse.parse(email));
});

router.post("/ai/simplify-assignment", async (req, res): Promise<void> => {
  const parsed = SimplifyAssignmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { assignmentText, subject } = parsed.data;

  const prompt = `You are helping a chronically ill student understand and break down an assignment into manageable pieces.

Assignment${subject ? ` (${subject})` : ""}:
${assignmentText}

Break this down for a student who may have limited energy. Be clear, encouraging, and practical.

Respond ONLY with valid JSON:
{
  "summary": "2-3 sentence plain-English summary",
  "importantTasks": ["key task 1", "key task 2"],
  "estimatedMinutes": 45,
  "steps": [
    {"stepNumber": 1, "description": "clear description", "estimatedMinutes": 10}
  ],
  "checklist": ["checklist item 1", "checklist item 2"]
}`;

  const completion = await openai.chat.completions.create({
    model: chatModel,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const breakdown = JSON.parse(content);
  res.json(SimplifyAssignmentResponse.parse(breakdown));
});

router.post("/ai/accommodation-recs", async (req, res): Promise<void> => {
  const parsed = GetAccommodationRecsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { symptoms, attendanceChallenges, fatigue, pain, mobility, concentration, additionalContext } = parsed.data;

  const prompt = `You are an educational resource advisor helping a chronically ill student understand what school accommodations might help them.

Student's challenges:
- Symptoms/conditions: ${(symptoms ?? []).join(", ") || "not specified"}
- Attendance challenges: ${attendanceChallenges ? "yes" : "no"}
- Fatigue: ${fatigue ? "yes" : "no"}
- Pain: ${pain ? "yes" : "no"}
- Mobility: ${mobility ? "yes" : "no"}
- Concentration: ${concentration ? "yes" : "no"}
${additionalContext ? `- Additional context: ${additionalContext}` : ""}

Recommend appropriate school accommodations. Be specific and explain why each helps.

Respond ONLY with valid JSON:
{
  "recommendations": [
    {"accommodation": "Extended test time", "reason": "Helps students who need extra time due to fatigue or pain", "category": "Testing"}
  ],
  "disclaimer": "These recommendations are informational only and should be discussed with your school counselor and healthcare provider. We are not medical professionals."
}`;

  const completion = await openai.chat.completions.create({
    model: chatModel,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content ?? "{}";
  const recs = JSON.parse(content);
  res.json(GetAccommodationRecsResponse.parse(recs));
});

export default router;
