# Client Snapshot: Mock Data & Backend Schema Spec

---

## BACKEND SCHEMA SPEC: MESSAGE FOR BACKEND TEAM

### Subject: Client Snapshot Mock Review

Hi team,

For integration of 'Coach' centric features in the chatbot, I am preparing a client snapshot schema(1) which will be injected into prompt when a Coach starts a session(2). Below is the schema I'm building against. Please confirm if this aligns with what will be available, flag any fields that might not exist, and let me know the field names if they differ.

**Assumptions**:
- This is a mock-up version, thus subjected to change as per requirements and alignment.
- The flow for *"injected into prompt when a Coach starts a session.."* is not concrete and can be interpreted in distinct ways, the current assumption is that the Coach gets the latest session details on chat invocation and that contains the *client_id* necessary for retrieving the data.

**Endpoint:** `GET /api/coach/client-snapshot/{client_id}`
**Auth:** Coach-scoped token (read-only)

**Top-level structure:**


| Field              | Type              | Notes                                          |
| ------------------ | ----------------- | ---------------------------------------------- |
| `snapshot_version` | string            | Assessment version string e.g. `"1.2"`         |
| `generated_at`     | ISO 8601 datetime | When the snapshot was generated                |
| `client`           | object            | Basic identity and org info                    |
| `assessment`       | object            | Full assessment result                         |
| `coaching`         | object            | Goals, upcoming session, session notes history |


**client object:**


| Field                   | Type          |
| ----------------------- | ------------- |
| `id`                    | string        |
| `name`                  | string        |
| `email`                 | string        |
| `organization`          | string        |
| `department`            | string        |
| `role_title`            | string        |
| `coach_id`              | string        |
| `engagement_start_date` | ISO 8601 date |


**assessment object:**


| Field                                       | Type              | Notes                                                 |
| ------------------------------------------- | ----------------- | ----------------------------------------------------- |
| `version`                                   | string            | Assessment instrument version                         |
| `completed_at`                              | ISO 8601 datetime |                                                       |
| `personality_type.octnumber`                | integer           | Platform type numerical identifier                    |
| `personality_type.style_name`               | string            | Human-readable behavior style name                    |
| `personality_type.desc`                     | string            | Few sentence type summary                             |
| `personality_type.environmental_preference` | string            | Kind of environment they flourish in                  |
| `personality_type.interaction_preference`   | string            | How they prefer to interact with the world            |
| `personality_type.character_strengths`      | string            | Strengths of their character rooted in behavior style |
| `personality_type.work_preference`          | string            | What kind of work they prefer and how they tackle it  |
| `personality_type.likes`                    | string            | Things they like                                      |
| `personality_type.dislikes`                 | string            | Things they don't like                                |
| `personality_type.warning_signs`            | string            | Warning signs indicating thier crash out              |
| `personality_type.do_when_feeling_stressed`      | string            | What they should do if feeling stressed              |


**coaching object:**


| Field                             | Type              | Notes                                                          |
| --------------------------------- | ----------------- | -------------------------------------------------------------- |
| `goals`                           | array             | Can be empty for new clients                                   |
| `upcoming_session.scheduled_at`   | ISO 8601 datetime |                                                                |
| `upcoming_session.session_number` | integer           |                                                                |
| `upcoming_session.format`         | string            | e.g. `"video_call"`, `"in_person"`                             |
| `session_notes`                   | array             | Can be empty — bot handles this gracefully. Return last 5 max. |


**session_notes object (per item):**


| Field                          | Type          |
| ------------------------------ | ------------- |
| `session_id`                   | string        |
| `session_number`               | integer       |
| `date`                         | ISO 8601 date |
| `behavioral_observations`      | string        |
| `client_engagement`            | string        |
| `what_worked`                  | string        |
| `areas_for_follow_up`          | string        |
| `action_items`                 | string array  |
| `suggested_focus_next_session` | string        |

---

## MOCK SNAPSHOT: FULL (client with session history)

```json
{
  "snapshot_version": "1.0",
  "generated_at": "2026-03-06T08:00:00Z",

  "client": {
    "id": "client_0042",
    "name": "Sarah Mitchell",
    "email": "s.mitchell@clientorg.com",
    "organization": "Acme Corp",
    "department": "Product",
    "role_title": "Senior Product Manager",
    "coach_id": "coach_0011",
    "engagement_start_date": "2025-10-01"
  },

  "assessment": {
    "version": "1.2",
    "completed_at": "2025-10-14T10:30:00Z",
    "personality_type": {
      : {
      "octnumber": 12,
      "style_name": "Authoritarian",
      "desc": "Red “State of Mind” is assertive, confident, driven, results-oriented, and strategic. Authoritarians are characterized by emergent leadership, fast-thinking,multi-tasking, problem-solving, and are self-starters. Authoritarians want to be incontrol, often seeking power, at times impatient, perfectionistic, and agitated. Indistress, Authoritarians display anger, perhaps pointing a finger or clenching a fist,raising their voice, pushing deadlines and finding fault in self or others.",
      "environmental_preference": "Assert and seeks control",
      "interaction_preference": "Shifts between working alone and with others",
      "character_strengths": "Assertive, Authoritative, Confident, Driven, Organized, Punctual,Results-oriented",
      "psychological_needs": "Recognition for Work, Time Structure, Clearly Defined Goals,Power,Sense of Purpose",
      "likes": "Leadership, Project Completion, Achievement, Closure, Results",
      "work_preference": "Leadership roles, Driven to transfer thoughts into actions,Organizational structure",
      "dislikes": "Surprises, Excuses, Inaction, Insubordination, Missing deadlines, Losingcontrol",
      "warning_signs": "Perfectionism, Critical, Controlling, Impatient, Frustrated",
      "do_when_feeling_stressed": "RELINQUISH the need to do everything yourself. Allow others to help. Work to be FLEXIBLE with time frames and commitments. Schedule yourself awell-needed break to RELAX. Even if it is just for 30 minutes. Be WILLING to answerquestions without fault-finding or blame. Work to ACCEPT responsibility for your actionsan decisions. APOLOGIZE for any accusations already said.",
      },
    },
  },

  "coaching": {
    "goals": [
      {
        "id": "goal_01",
        "description": "Develop more effective cross-functional communication",
        "status": "in_progress",
        "set_at": "2025-10-20"
      },
      {
        "id": "goal_02",
        "description": "Build confidence in stakeholder influence without over-relying on data",
        "status": "in_progress",
        "set_at": "2025-11-05"
      }
    ],
    "upcoming_session": {
      "scheduled_at": "2026-03-10T14:00:00Z",
      "session_number": 5,
      "format": "video_call"
    },
    "session_notes": [
      {
        "session_id": "session_001",
        "session_number": 1,
        "date": "2025-10-20",
        "behavioral_observations": "Client engaged analytically throughout. Strong command of her domain but visibly uncomfortable when asked to reflect on interpersonal dynamics with her team.",
        "client_engagement": "Receptive to structured frameworks. Showed slight resistance when conversation moved away from task-based topics.",
        "what_worked": "Anchoring discussion to specific workplace scenarios rather than general reflection.",
        "areas_for_follow_up": "Relationship with direct reports — she deflected twice when this came up.",
        "action_items": [
          "Client to observe one team meeting this week and note her communication style vs. others'",
          "Coach to share methodology reading on [DIMENSION_1_LABEL] profiles in team settings"
        ],
        "suggested_focus_next_session": "Start with the observation exercise debrief. Ease into interpersonal reflection from there."
      },
      {
        "session_id": "session_002",
        "session_number": 2,
        "date": "2025-11-05",
        "behavioral_observations": "More open this session. Completed the observation exercise and had concrete examples to discuss. [DIMENSION_2_LABEL] score aligns with what she described — finds ambiguous social dynamics draining.",
        "client_engagement": "More relaxed. Laughed twice. Good sign.",
        "what_worked": "Using her own examples as entry points rather than introducing concepts first.",
        "areas_for_follow_up": "Stakeholder communication upward (with her VP) — mentioned it briefly but moved on.",
        "action_items": [
          "Client to prepare for an upcoming VP presentation using the communication preference framework",
          "Set goal around stakeholder influence for next 60 days"
        ],
        "suggested_focus_next_session": "VP presentation debrief. Introduce goal_02 formally."
      },
      {
        "session_id": "session_003",
        "session_number": 3,
        "date": "2025-12-01",
        "behavioral_observations": "Stress pattern visible — came in with a lot of data and analysis, mentioned a difficult sprint review. Classic risk-averse mode.",
        "client_engagement": "Initially closed. Opened up in the second half once the immediate work pressure was acknowledged.",
        "what_worked": "Naming the stress pattern explicitly (she found it validating, not critical).",
        "areas_for_follow_up": "How she recovers after high-stress periods. Resilience angle worth exploring.",
        "action_items": [
          "Client to identify one situation next month where she deliberately slows down the analysis and asks a team member's opinion first"
        ],
        "suggested_focus_next_session": "Follow up on the experiment. Introduce resilience framing from the methodology."
      },
      {
        "session_id": "session_004",
        "session_number": 4,
        "date": "2026-01-20",
        "behavioral_observations": "Noticeable shift — described asking a colleague for input on a roadmap decision and finding it useful. Small but meaningful given her blind spot profile.",
        "client_engagement": "Energised. Brought the topic up herself without prompting.",
        "what_worked": "The experiment format — small, low-risk actions with observable outcomes suit her profile well.",
        "areas_for_follow_up": "Sustaining the behaviour change under pressure. Will it hold when the next stressful sprint hits?",
        "action_items": [
          "Coach to check in on this at session 5",
          "Client to continue the experiment with a different colleague"
        ],
        "suggested_focus_next_session": "Review behaviour change sustainability. Assess readiness to tackle goal_02 more directly."
      }
    ]
  }
}
```

---

## MOCK SNAPSHOT: EMPTY NOTES VARIANT (new client or no session history yet)

```json
{
  "snapshot_version": "1.0",
  "generated_at": "2026-03-06T08:00:00Z",

  "client": {
    "id": "client_0091",
    "name": "James Okafor",
    "email": "j.okafor@clientorg.com",
    "organization": "Nexus Ltd",
    "department": "Engineering",
    "role_title": "Engineering Lead",
    "coach_id": "coach_0011",
    "engagement_start_date": "2026-03-01"
  },

  "assessment": {
    "version": "1.2",
    "completed_at": "2025-10-14T10:30:00Z",
    "personality_type": {
      : {
      "octnumber": 12,
      "style_name": "Authoritarian",
      "desc": "Red “State of Mind” is assertive, confident, driven, results-oriented, and strategic. Authoritarians are characterized by emergent leadership, fast-thinking,multi-tasking, problem-solving, and are self-starters. Authoritarians want to be incontrol, often seeking power, at times impatient, perfectionistic, and agitated. Indistress, Authoritarians display anger, perhaps pointing a finger or clenching a fist,raising their voice, pushing deadlines and finding fault in self or others.",
      "Environmental Preference": "Assert and seeks control",
      "Interaction Preference": "Shifts between working alone and with others",
      "Character Strengths": "Assertive, Authoritative, Confident, Driven, Organized, Punctual,Results-oriented",
      "Psychological Needs": "Recognition for Work, Time Structure, Clearly Defined Goals,Power,Sense of Purpose",
      "Likes": "Leadership, Project Completion, Achievement, Closure, Results",
      "Work Preference": "Leadership roles, Driven to transfer thoughts into actions,Organizational structure",
      "Dislikes": "Surprises, Excuses, Inaction, Insubordination, Missing deadlines, Losingcontrol",
      "Warning Signs": "Perfectionism, Critical, Controlling, Impatient, Frustrated",
      "When feeling STRESSED": "RELINQUISH the need to do everything yourself. Allow others tohelp. Work to be FLEXIBLE with time frames and commitments. Schedule yourself awell-needed break to RELAX. Even if it is just for 30 minutes. Be WILLING to answerquestions without fault-finding or blame. Work to ACCEPT responsibility for your actionsan decisions. APOLOGIZE for any accusations already said.",
      },
    },
  },

  "coaching": {
    "goals": [],
    "upcoming_session": {
      "scheduled_at": "2026-03-10T10:00:00Z",
      "session_number": 1,
      "format": "video_call"
    },
    "session_notes": []
  }
}
```
