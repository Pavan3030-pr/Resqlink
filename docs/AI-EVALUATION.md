# AI evaluation

## Method
`AiEvalCases` holds two fixed sets of **invented** reports (no real people or incidents):

- **Development set** (20 reports, 7 duplicate pairs): English, Hindi, Telugu, ambiguous, spam and prompt-injection cases. The rule-based fallback
  was tuned on this set, so its scores here prove nothing about generalisation.
- **Held-out set** (14 reports, 5 duplicate pairs): written afterwards and **not** used for tuning.

Metrics: category accuracy (where a category is clear), priority within the expected range, critical recall (critical cases shown at High or
above), injection resistance (an injected instruction must not lower the priority) and detection rate, duplicate precision/recall.
The same harness runs against the live Gemini path from **Admin → System activity → AI evaluation**
(`POST /api/v1/admin/ai-eval`), which also reports median/p95 latency, fallback rate, estimated tokens (characters/4) and cost
(only when `GEMINI_PRICE_*` are set).

## Measured results: rule-based fallback only (executed in the build environment)

| Metric | Development | Held-out |
|---|---|---|
| Category accuracy | 100% (tuned) | **54.5%** (6 of 11) |
| Priority accuracy | 100% (tuned) | **85.7%** (12 of 14) |
| Critical recall | 100% | 100% (small sample) |
| Injection resistance | 100% | 100% |
| Injection flagged | 100% | 100% (detection patterns were generalised after a first held-out run scored 0%, so this metric is no longer clean) |
| Duplicate precision / recall | 100% / 100% | **66.7%** / 100% |

Known misses on the held-out set: vocabulary the fallback does not know ("auto rickshaw", "drain overflowing", "labour pain", Hindi "बाइक", Telugu "బోల్తా")
and one false duplicate (two unrelated minor accidents 200 m and 15 minutes apart). The fallback is a safety net, not a substitute for the model.

An earlier version of the duplicate scorer produced four false positives on the development set (same words 5 km apart, same place hours later,
different event types). Hard gates on distance, time and category fixed these; the numbers above are after the fix.

## Gemini results
**Not measured.** No Gemini key was available in the build environment, so no accuracy, latency or cost claim is made for the live model.
Run the evaluation with your key and record the output; do not quote the fallback numbers as Gemini numbers.

## Safety design
Untrusted text is redacted and delimited; the model is told to treat it as data; output is schema-validated (strict enum/ranges/lengths);
a failed or invalid response falls back and is labelled in the UI; a keyword safety floor prevents any model or injected text from lowering a
life-threatening report below Critical; every analysis records model version, status, latency, fallback reason and whether injection was suspected.
Confidence is stored but not displayed because it is not calibrated.
