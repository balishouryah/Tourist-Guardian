# Phase 5: AI Behavioural Intelligence Final Report

## 1. Root Cause of Stale Nooman Score
The stale `70/100` score for Nooman persisted because of the way the React local `useSafetyEngine` interacted with the Supabase database. On app launch, `useSafetyEngine` initialized its local `lastScore` variable to `100` by default. When the engine evaluated the tourist's current safe location, it calculated a new score of `100`. Because the engine only synced to Supabase when the score changed by at least 10 points (i.e., `Math.abs(100 - 100) >= 10`), it never realized the database was out of sync (stuck at 70 from a previous session). Consequently, the Authority AI Risk map loaded the 70 directly from Supabase, causing the persistent mismatch.

## 2. Current vs Historical Safety State Distinction
The architecture correctly separates active, live states from historical logs:
- **Current State** (`public.tourists.current_safety_score`, etc.) reflects the live session. If a tourist is safe *right now*, this must be `100`.
- **Historical State** (`public.safety_events`, `public.incidents`) is permanent. If a tourist entered a danger zone yesterday, it remains in their historical timeline but does not blindly penalize their fresh session today.

## 3. Initialization Logic
To cleanly initialize a tourist session without overwriting an ongoing, active physical emergency:
- I modified `useSafetyEngine` to initialize its `lastScore` reference to `null`.
- On the very first evaluation of a tourist's session, the engine forces a database synchronization with the newly calculated score.
- If the tourist is currently in a safe location, it computes `100/SAFE` and pushes that to the database, wiping out any stale penalties from yesterday.
- If the tourist physically opens the app *while standing in a Danger zone*, it computes `70/CAUTION` and pushes that, correctly preserving their active physical risk state.

## 4. Multi-Tourist Isolation
Because `useSafetyEngine` is instantiated per tourist instance inside the `SafetyProvider` context, all initialization and risk evaluations are entirely isolated. Tourist B running on one device will evaluate and push their own isolated location data, completely independently of Tourist C or Nooman. 

## 5. Nooman Reset & Test Procedure
To allow developers to manually clear out test states without destroying historical data or rebuilding accounts, I added a safe `[DEV] Reset Safety State` button to the Tourist Dashboard (visible only in development mode). 
Clicking this button cleanly forces the local `safetyState` to `100/SAFE`, clears active test zones, and pushes the clean state to the backend. This provides a direct, safe way to reset Nooman to `100` for the start of any new test scenario.

## 6. Database Changes
No permanent schema migrations were required. The fix was entirely localized to the React lifecycle and session initialization rules in `useSafetyEngine.js`. All historical data (`safety_events`, `incidents`) remains fully intact.

## 6.b. Realtime State Synchronization Bug (Critical State Desync)
**Root Cause:**
A critical synchronization bug was discovered where the Tourist Dashboard would correctly calculate a clean `100/SAFE` state (e.g., after a GPS dropout was restored), but the Authority Dashboard remained stuck at `30/CRITICAL` displaying an old "GPS signal lost" signal. 
The root cause was traced to the synchronization condition in `useSafetyEngine.js`. The engine was optimized to only push updates to Supabase if the *numeric score* changed by at least 10 points `Math.abs(lastScore - newRisk.score) >= 10`. However, if the active *signals* changed (e.g., an anomaly was detected or cleared) but the final *score* didn't jump by a full 10 points, the engine failed to sync the clean state back to the database. This left the Supabase `tourists` table permanently holding the stale critical state.

**Fix Implemented:**
- Upgraded `useSafetyEngine` to explicitly track `lastSeverity` and `lastSignals` using references.
- The engine now immediately pushes to the database if the numeric score changes significantly, OR if the severity label changes, OR if the exact array of behavioral signals changes.
- This guarantees that when a signal like `GPS signal lost -> 8 min` is cleared locally on the device, the clean array `[]` is instantly synced to Supabase, updating the Authority Realtime Map in under a second without page refreshes.

## 7. Map & UI Integration 
- The AI Risk Center map was overhauled to replace the static placeholder with the real `LiveTouristLeaflet` map.
- The map is deeply integrated with the newly accurate `current_safety_score` data.
- Markers physically change color based on Severity (Critical = Red pulse, High = Orange, Caution = Yellow, Safe = Green).
- Clicking any tourist marker reveals a custom popup with their exact Safety Score, Severity, and a `[ VIEW TOURIST ]` shortcut.
- A new `[ FIT ALL TOURISTS ]` button instantly refocuses the map bounds on all active tourists.

## 8. Build Result
- `npm run build` executed successfully.
- 0 Errors.
- Clean compilation for all dynamic imports.

## 9. Oxlint Result
- `npx oxlint` executed successfully.
- 0 Errors.
- Code conforms strictly to all repository linting rules.
