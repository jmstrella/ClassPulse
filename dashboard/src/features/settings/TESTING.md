# Track B (Thresholds) — Testing Guide

This guide describes how to verify the adjustable thresholds feature built in `dashboard/src/features/settings/`.

---

## 1. Automated Vitest Tests

Run the test suite in `dashboard/`:

```bash
cd dashboard
npm test
```

### What is covered:
- **Default settings validation**: Verifies defaults are valid.
- **Distracted threshold rules**: Whole number check, bounds (15s to 600s), and rejection of invalid values.
- **Idle threshold rules**: Whole number check, bounds (60s to 1800s), and rejection of invalid values.
- **Offline threshold rules**: Whole number check, bounds (60s to 600s), and strict rejection of `< 60s` to prevent false offline flags due to the 30-second heartbeat interval.
- **Presets matching**: Relaxed (120/300/120), Normal (60/180/90), and Strict (30/90/75).
- **Settings equality & format helpers**: Precise dirty tracking and human-readable formatting.

---

## 2. Manual Verification with Simulator

### Step A: Start the Dashboard
1. Open terminal:
   ```bash
   cd dashboard
   npm run dev
   ```
2. Log in and create a new session (e.g. "Test CS 101").
3. Note the generated class code (e.g., `PUP-4821`).

### Step B: Start Simulated Students
From the repo root:
```bash
npm run simulate -- --code PUP-4821 --count 8 --interval 5
```

### Step C: Test Settings & Live Board Interaction
1. **Navigate to the Settings Tab**:
   - You should see the 3 threshold inputs populated with current settings (Default: Distracted 60s, Idle 180s, Offline 90s).
   - "Quick Presets" cards display Relaxed, Normal, Strict with "Normal" highlighted as active.
   - "How statuses are decided" explains the rules dynamically using the current input values.
   - "Live Status Preview" shows the real-time breakdown of the 8 simulated students and compares Saved vs Preview.

2. **Test Inline Validation & Save Blocking**:
   - Change `offline_after_seconds` to `50` (or `45`).
   - Notice the inline red error: *"Must be at least 60 seconds (heartbeat runs every 30s)"*.
   - Notice the **Save Changes** button is disabled.
   - Enter `10` for distracted threshold: notice inline error *"Must be between 15 and 600 seconds"*.

3. **Test Quick Presets**:
   - Click the **Strict** preset button (Distracted: 30s, Idle: 90s, Offline: 75s).
   - Notice:
     - Form values immediately fill with 30, 90, 75.
     - "Strict" preset is highlighted with a "Selected" badge.
     - An **Unsaved changes** indicator appears with a **Discard** button.
     - The "How statuses are decided" panel updates the text dynamically to 30s, 1m 30s, 1m 15s.
     - The Live Status Preview updates to show any projected student status shifts with diff chips (e.g. `+1`, `-1`).

4. **Test Discard and Reset**:
   - Click **Discard**: Form values restore to the session's saved settings and the dirty indicator disappears.
   - Modify a value, then click **Reset to defaults**: Form resets to 60s / 180s / 90s.

5. **Test Save & Live Board Real-Time Sync**:
   - Choose **Strict** (or set custom distracted to 20s) and click **Save Changes**.
   - Notice the success banner: *"Thresholds saved successfully! The Live Board updates in real-time."*
   - Switch back to the **Live Board** tab:
     - Notice that students who were Active or temporarily unfocused transition to **Distracted** faster due to the stricter 20s/30s threshold.
     - No page refresh or manual reload was required.

---

## 3. Lint & Build Checks

Verify code quality in `dashboard/`:
```bash
cd dashboard
npm run lint
npm run build
```
Ensure zero TypeScript errors and no lint warnings.
