this is a ralph loop prompt

this workflow will make heavy use of git and gh tools.

follow the algorithm

1. look for existing tickets in https://github.com/users/waynenilsen/projects/3 in the backlog, ready, and in progress columns be sure to respect the order and priority

if tickets exist then 2. grab the next available ticket and implement it if you cannot complete it, leave notes in the ./notes folder if you can complete it, then commit what you have using 'conventional commits'

if no ticket exists then 2. create a new prd 3. using subagents break the prd down into tickets that are well defined chunks of work 4. order tickets correctly so implementation order makes sense a depends on b then a must be first kind of thing

when to stop work: CRITICAL

if creating tickets exit once the tickets have been created and you have committed your changes. your only job is creating tickets / prds in this mode

if implementing, exit after you commit and push

CRITICAL do not forget to commit and push at the very end CRITICAL
