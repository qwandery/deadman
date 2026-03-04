CRITICAL OPERATING INSTRUCTIONS:

1. Project Specifications Document (SPECIFICATION.md). Ensure there is a document in the root called SPECIFICATION.md. This document shall include the complete, verbatim SPECIFICATION. Purpose: Ensures that you always have a "canonical" understanding of the full scope of the project.
   a. NEVER Modify the SPECIFICATION.md file WITHOUT EXPLICIT INSTRUCTIONS FROM ME TO DO SO!
   b. DO Review the SPECIFICATION.md document before beginning any new Task.

2. Project Tracking Document (TODO.md). Ensure there is a document in the repository root called TODO.md. This document shall include all Phases & Tasks required to implement the SPECIFICATION in SPECIFICATION.md. Purpose: Shall be used to actively keep track of your work, in order to keep you focused and oriented across a large project with many tasks and many context sessions, while preventing missed tasks or duplication of effort.
   a. DO Organize the TODO.md document into Phases and Tasks.
   b. DO Ensure that each Task and Phase is preceded with a checkbox: [ ]
   c. NEVER Modify or Remove the text of *existing* Phases or Tasks in the TODO.md document. Treat the document as STRICTLY ADDITIVE-ONLY (APPENDS and INSERTS allowed; NO MODIFICATIONS of existing text), EXCEPT:
   d. DO check off each previously-completed Task and Phase by inserting [ ] to [✅] beside each completed Task or Phase as you complete them. (You may replace the space ` ` character between the brackets with ✅. That's the ONLY modification allowed!)
   e. NEVER check off a Task or Phase UNTIL you have pro-actively verified that the work has been COMPLETED and that it has been PUSHED!
   f. DO Review the TODO.md BEFORE beginning a new Task in order to understand the specifics of your current Task.
   g. DO Review the TODO.md AFTER completing a Task in order to ensure you met the requirements of the current Task and mark it complete (see #2(e)).
   h. YOU MAY add NEW Tasks that are not yet in the TODO.md document AS LONG AS:
      -- The new task aligns with the SPECIFICATION in the SPECIFICATION.md file, AND
      -- The new task is NOT already represented in the TODO.md (including in a different form or phase).

3. Task Lifecycle. Following are the MANDATORY STEPS for completing any Task, IN ORDER:
   a. Review the SPECIFICATION.md document to refresh your memory about the overall scope and purpose of the project.
   b. Review the current state of the ENTIRE project to gain an understanding of what's actually been implemented or completed and what is still outstanding.
   c. Review the TODO.md document:
      -- Verify: Does the current documented completion state (checked vs unchecked Tasks & Phases) FULLY ALIGN with your understanding of the current ACTUAL state of the project, as per #3(b)?
      -- WARNING: IF your understanding of the ACTUAL current state of the project does not align with the state of TODO.md then STOP IMMEDIATELY and REPORT the discrepancy to me! DO NOT CONTINUE.
      -- OTHERWISE:
      -- Locate the FIRST Task in the document that does not have a [✅] before it. This is your next Task.
   d. COMPLETE your next Task, Rigorously following best practices (see #4) AT ALL TIMES. NOTE: YOU MAY commit your changes at ANY TIME during completion of the task.
   e. IMPORTANT: Immediately after completing the task, REVIEW your Work CRITICALLY:
      -- Was anything about the Task implemented or executed incorrectly? If so, RETURN to #3(d).
      -- Was anything about the Task *missed* that either IS described in the TODO.md entry for this Task, OR that definitely SHOULD have been part of this task (and is not already covered by a later Task)? If so, RETURN to #3(d).
      -- Was anything implemented in a sloppy, haphazard, incomplete, or lazy manner, or a manner that does NOT align with best practices and patterns (see #4)? If so, RETURN to #3(d).
      -- Is there anything about your implementation or execution on the Task that could CONFLICT with, OVERLAP with, or cause bugs or issues relating to, something else about the project or its dependencies? If so, RETURN to #3(d) OR, if you aren't sure, STOP IMMEDIATELY and REPORT your concern. DO NOT CONTINUE.
      -- **Documentation:** Is there anything about this Task that *contradicts*, *supers
      -- OTHERWISE:
   f. RUN THE LINTER.
      -- NEVER IGNORE a single Lint Error OR Warning, EVEN if it seems unrelated.
      -- IF Any Errors or Warnings occur, IMMEDIATELY FIX ALL Errors AND Warnings, THEN RETURN to #3(d).
      -- IF you're unable to fix the Lint issue for ANY REASON, STOP IMMEDIATELY and REPORT the issue to me. DO NOT CONTINUE.
      -- OTHERWISE:
   g. BUILD THE PROJECT.
      -- NEVER IGNORE a single Build Error OR Warning, EVEN if it seems unrelated.
      -- IF ANY Errors OR Warnings occur, IMMEDIATELY FIX ALL Errors and Warnings, THEN RETURN to #3(d).
      -- If you're unable to fix the Build issue for ANY REASON, STOP IMMEDIATELY and REPORT the issue to me. DO NOT CONTINUE.
      -- OTHERWISE:
   h. RUN ALL TESTS (Unit, Integration, UI/Component, E2E).
      -- NEVER IGNORE a single Test Failure or unexpected result, EVEN if it seems unrelated.
      -- IF ANY Test fails (*anything* less than 100% Passing), OR generates errors or warnings or unexpected results IN ANY WAY, IMMEDIATELY identify the ROOT CAUSE and FIX it. THEN RETURN to #3(d).
      -- IF you're unable to fix the Test for ANY REASON, STOP IMMEDIATELY and REPORT the issue to me. DO NOT CONTINUE.
      -- OTHERWISE:
   i. UPDATE DOCUMENTATION as Needed -- but do so mindfully (see #8 AND #9)!
   i. COMMIT YOUR CHANGES to git.
      -- IF you're unable to commit for ANY REASON, STOP IMMEDIATELY and REPORT the issue to me. DO NOT CONTINUE.
      -- OTHERWISE:
   j. PUSH YOUR CHANGES to GitHub.
      -- NEVER SKIP THIS STEP (see #5)!
      -- If you're unable to push for ANY REASON, STOP IMMEDIATELY and REPORT the issue to me. DO NOT CONTINUE.
      -- OTHERWISE:
   k. Review the TODO.md.
      -- Locate the FIRST Task *in the document* that does NOT have a [✅] before it.
      -- Is it the same Task you have just completed? IF NOT, STOP IMMEDIATELY and REPORT the discrepancy to me. DO NOT CONTINUE.
      -- OTHERWISE:
      -- Review the work you've just completed and VERIFY that the work you've COMPLETED AND PUSHED, ALIGNS 100% with the same item in the TODO.md doc. IF NOT, STOP IMMEDIATELY and REPORT the discrepancy to me. DO NOT CONTINUE.
      -- OTHERWISE:
      -- Change [ ] to a [✅] for the Task.
      -- OPTIONAL: Append a "NOTE:" to the Task describing what was actually completed.
      -- Commit and push (following the same guidance as in #3(g) and #3(h)).
   l. Review INSTRUCTIONS.md (see #6).
   m. RETURN to #3(a) to CONTINUE TO THE NEXT TASK.

4. Enterprise Patterns & Best Practices - AT ALL TIMES, you must rigorously follow enterprise-grade patterns and best practices. These include, but are NOT LIMITED to:
   a. SOLID principles!
   b. Clean Code
   c. Clean Architecture
   d. Separation of Concerns
   e. Testable, modular, extensible code
   f. Mindful toward proper Configuration, Logging, and Testing considerations
   g. Mindful toward multi-environment & CI/CD considerations
   h. Mindful toward Authentication & Authorization considerations (Tenants, Users, RBAC, etc. as appropriate per the SPECIFICATION)
   i. Security first
   j. Maintain absolute compliance with Architectural design decisions according to the SPECIFICATION!
   k. ENSURE unit, integration, UI/component, E2E and LIVE Test Coverage is exhaustive for all features according to the SPECIFICATION
   l. WHILE Executing each Task, run ALL tests and for any and all test failures, identify and fix the root cause, ensuring that 100% of tests pass without exception.
   m. Keep it tight & efficient!
      -- Intuitive logical boundaries
      -- Don't reinvent the wheel
      -- Use trusted third-party dependencies to reduce effort AND maintenance burden
      -- No unnecessary overlap or duplication: Aim for "one way and one way only" to do X
      -- Remove obsolete or deprecated code ASAP
   n. Documentation is Good, BUT (see #8):
      -- GOOD Documentation is Better!
      -- GOOD Documentation is clear, complete yet concise, and above all, ACCURATE.
      -- WRONG Documentation is worse than NO Documenation!
      -- TOO MUCH Documentation is worse than BAD Documentation!

5. Commit & Push FREQUENTLY - Remember to Push your branch FREQUENTLY. Commit and Push even between individual Steps within a single Task. This environment is ephemeral and temperamental and we cannot risk losing completed work mid-Task when the environment inevitably becomes unstable!

6. CRITICAL OPERATING INSTRUCTIONS (INSTRUCTIONS.md).
   -- THIS DOCUMENT must exist in the repository root as INSTRUCTIONS.md.
   -- After EVERY Task is completed, Review INSTRUCTIONS.md in order to ensure they remain fresh, current, and accurate in your current context window.
   -- NEVER CHANGE INSTRUCTIONS.md UNDER ANY CIRCUMSTANCES. (I will change it manually myself if the need arises.)

7. Task Deferrment. You may be tempted at times to Defer or Delay your current Task, deciding it makes more sense to implement the task at a later stage (or that it's no longer necessary, for whatever reason). NEVER DO THIS! Instead, do the following, in order:
   a. REPORT your concern to me.
   b. Review TODO.md.
   c. ADD a NEW, additional Task to revisit, continue, or expand on the current Task in a future Phase that seems more appropriate.
   c. Then, CONTINUE THE CURRENT TASK *ANYWAY*. IMMEDIATELY proceed to implement/execute the current Task despite your  concern, completing it to the utmost of your ability based on the current state of the project.

8. DOCUMENTATION. Although it is always acceptable and appreciated to add documentation (such as MARKDOWN documents) to the document, documentation quickly becomes overwhelming and useless when (a) there's too much of it and (b) it becomes outdated. FOLLOW THESE GUIDELINES when preparing to add a new document:
   a. ONLY THE FOLLOWING DOCUMENTS are allowed in the repository root:
      -- README.md (see #9)
      -- SPECIFICATION.md (see #1 and #10)
      -- TODO.md (see #2 and #10)
      -- INSTRUCTIONS.md (see #6 and #10)
   b. All other documents belong in a directory called `/_docs`. HOWEVER:
   c. BEFORE adding any new Document, consider:
      -- Is it needed? Is there an EXISTING document that covers this purpose that you could update, instead of adding a new one?
      -- Is the new information necessary and meaningful?
      -- If any information in this Document might SUPERSEDE or REPLACE content in existing Documents, update the information in the old document
      -- If this document provides more FOCUSED information than what's already available, it's OKAY to add it, BUT:
      -- LINK DOCUMENTS OFTEN where it makes sense to do so!

9. README.md. As you know this is the go-to document for providing developer information about the project. As such:
   a. THE INFORMATION IN THIS DOCUMENT MUST BE CURRENT AND ACCURATE AT ALL TIMES.
   b. The information must be internally consistent and NEVER contradict itself.
   c. The document SHOULD evolve and change over time as the project evolves,
   d. The information in README.md should always be straightforward, concise, and readable, and include the "preferred" way to do things.
   e. For example, if there's more than one way to do something (say, in the case of a command line setup/init or seed script) please make sure the README has the preferred method!
   f. If any Task changes the how the system works, again, the README should be updated.

10. Treat INSTRUCTIONS.md, SPECIFICATION.md, and TODO.md as "sacred" (see #1 and #2).
   -- NEVER modify INSTRUCTIONS.md yourself under any circumstances.
   -- NEVER modify SPECIFICATION.md without explicit instructions.
   -- NEVER *remove* or *change* any content from TODO.md.
   -- NEVER mark a Phase or Task as completed unless it is ACTUALLY 100% completed.
