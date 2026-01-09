# What Makes a Good PRD

A Product Requirements Document (PRD) is the foundation of successful product development. Here are the key characteristics that distinguish excellent PRDs from mediocre ones.

## 1. Clarity and Specificity

**Good PRD:**
- Uses precise, unambiguous language
- Provides concrete examples and use cases
- Avoids jargon unless necessary (and defines it when used)
- Includes measurable criteria, not vague descriptions

**Example:**
- ❌ "The app should be fast"
- ✅ "The app should load the main dashboard in under 2 seconds on a 3G connection"

## 2. User-Centric Focus

**Good PRD:**
- Starts with user problems, not solutions
- Includes user personas and their needs
- Describes user journeys and workflows
- Explains the "why" behind each requirement

**Key Questions:**
- Who is the target user?
- What problem are they trying to solve?
- How does this feature improve their experience?
- What happens if we don't build this?

## 3. Comprehensive Scope Definition

**Good PRD:**
- Clearly defines what's in scope
- Explicitly states what's out of scope (and why)
- Identifies dependencies and blockers
- Includes phased rollout plans if applicable

**Scope Boundaries:**
- Must-have vs. nice-to-have features
- MVP vs. future iterations
- Current phase vs. future phases

## 4. Measurable Success Criteria

**Good PRD:**
- Defines clear, quantifiable success metrics
- Establishes baseline measurements
- Sets realistic targets with timelines
- Includes both leading and lagging indicators

**Types of Metrics:**
- **Engagement**: DAU/MAU, session duration, feature adoption
- **Business**: Revenue, conversion rates, retention
- **Quality**: Error rates, performance benchmarks, user satisfaction scores

## 5. Detailed User Stories with Acceptance Criteria

**Good PRD:**
- Each feature broken down into user stories
- Clear acceptance criteria for each story
- Prioritized (Must Have, Should Have, Could Have, Won't Have)
- Includes edge cases and error scenarios

**User Story Format:**
```
As a [user type]
I want [goal]
So that [benefit]

Acceptance Criteria:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

## 6. Technical Feasibility Consideration

**Good PRD:**
- Acknowledges technical constraints
- Includes architecture considerations (when relevant)
- Identifies integration points
- Considers scalability and performance needs
- Leaves room for engineering input

**Note:** PRD should focus on "what" and "why," not prescribe "how," but should be aware of technical realities.

## 7. Design and UX Guidelines

**Good PRD:**
- Describes desired user experience
- References design system components
- Includes accessibility requirements
- Specifies responsive design needs
- Provides wireframes or mockups (or links to them)

## 8. Edge Cases and Error Handling

**Good PRD:**
- Documents boundary conditions
- Describes error scenarios and user feedback
- Includes validation rules
- Specifies fallback behaviors
- Addresses "what if" scenarios

**Common Edge Cases:**
- Empty states
- Error states
- Network failures
- Invalid inputs
- Concurrent user actions
- Data migration scenarios

## 9. Risk Assessment and Mitigation

**Good PRD:**
- Identifies potential risks
- Proposes mitigation strategies
- Lists assumptions made
- Documents open questions
- Includes contingency plans

## 10. Stakeholder Alignment

**Good PRD:**
- Gets input from all relevant stakeholders
- Addresses concerns from different perspectives
- Balances business, user, and technical needs
- Includes sign-off from key decision-makers
- Maintains version control and change log

## 11. Living Document Approach

**Good PRD:**
- Updated as requirements evolve
- Maintains change history
- Links to related documents (design specs, technical specs, test plans)
- Includes feedback loops from development and testing
- Documents decisions and rationale

## 12. Actionable and Testable

**Good PRD:**
- Requirements can be verified through testing
- Acceptance criteria are specific enough to test
- Success metrics can be measured
- Clear definition of "done"

## Common PRD Pitfalls to Avoid

1. **Too Vague**: "Make it better" or "improve the UX"
2. **Too Prescriptive**: Dictating specific technical implementations
3. **Missing Context**: Not explaining the problem or business case
4. **Scope Creep**: Including everything without prioritization
5. **No Success Metrics**: Can't measure if the feature succeeded
6. **Ignoring Edge Cases**: Only describing the happy path
7. **No User Perspective**: Focusing on features instead of user needs
8. **Outdated**: Not keeping the document current as requirements change
9. **Siloed Creation**: Written without input from engineering, design, or users
10. **No Prioritization**: Everything treated as equally important

## PRD Quality Checklist

Before finalizing your PRD, verify:

- [ ] Problem statement is clear and compelling
- [ ] Target users are well-defined
- [ ] Success metrics are measurable and realistic
- [ ] User stories have clear acceptance criteria
- [ ] Edge cases and errors are documented
- [ ] Dependencies and risks are identified
- [ ] Scope boundaries are explicit
- [ ] Technical constraints are acknowledged
- [ ] Design considerations are included
- [ ] Stakeholders have reviewed and aligned
- [ ] Open questions are documented
- [ ] Requirements are testable
- [ ] Document is accessible to all team members

## Best Practices

1. **Start with Why**: Always begin with the problem and business case
2. **Use Examples**: Concrete examples make abstract concepts tangible
3. **Visual Aids**: Include diagrams, flowcharts, and mockups when helpful
4. **Regular Reviews**: Schedule periodic reviews to keep PRD current
5. **Version Control**: Track changes and maintain history
6. **Collaborative**: Involve cross-functional teams early
7. **Iterative**: Refine based on feedback and new information
8. **Concise but Complete**: Balance detail with readability

## Conclusion

A good PRD serves as a single source of truth that aligns the entire product team. It should be clear enough for anyone on the team to understand what's being built and why, specific enough for engineers to implement, and flexible enough to evolve as you learn more. The best PRDs are collaborative, user-centric, and focused on solving real problems with measurable outcomes.
