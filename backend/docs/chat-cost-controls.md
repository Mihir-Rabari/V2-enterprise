# Chat cost controls

Shopping chat uses one assistant flow, with no separate model-based safety classifier.
Local input checks and redaction run first. Contextual policy refusals use the
`decline_request` tool in that same assistant response. A refusal cancels all other
tools in its batch. Server-side price, stock, output and cart-intent checks remain.
This removes an independent model verifier; policy routing now shares the assistant
model, while deterministic validation stays independent.

## Calls and context

- Plain responses use one model call. Tool lookups may require subsequent rounds.
- Verified empty searches finish on the server, without a second generation call.
- Confirmed pending cart offers still use live database checks and zero model calls.
- Recovery and tool calls share the existing five-call ceiling per user turn.
- History contains at most eight messages and 6,000 characters, keeping complete
  recent exchanges. No summarization model is used; older context can be dropped.
- The prompt is shorter and its leak-detection marker is stable across workers and
  restarts. Tool ordering and the static instructions stay ahead of user content.

## Caching and measurement

Claude explicitly marks the shared system block for ephemeral caching, covering
the preceding tools as well. Changing conversation messages aren't marked as
separate cache writes. Gemini uses provider-managed implicit prefix caching;
OpenAI-compatible endpoints use whichever automatic caching their model supports.
Provider minimum token thresholds and traffic determine whether a request hits.
No paid explicit Gemini cache resources are created, and cache hits are not assumed.

Adapters record cache-read tokens when reported, subtract them from uncached input,
and retain thinking/output token accounting. ChatUsage records the result for
budget monitoring. Cost figures remain estimates from the configured model pricing.

Product answers, stock, cart contents, and customer conversations are never served
from a shared response cache. Admin image drafts still use tool-free multimodal
completions and their existing output limit.

Run `npm run build` and `npm test` in backend. Tests cover no classifier calls,
single-call empty searches, same-batch refusal, recovery, history limits and cache
usage accounting. Live cache-hit rates and actual invoice savings need production
usage data.
