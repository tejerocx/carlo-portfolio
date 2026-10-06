# Critique log: agh-reel (9x16)

## Round 1
| hook | read | motion | variety | brand | sync | min |
|  5   |  7   |   7    |    7    |   7   |  7   |  5  |

Worst three:
1. [beat 0, 9x16] Frame 0 was an empty navy field; the ribbons hadn't entered yet. A thumb scrolls past an empty frame. -> Fixed: `ribbonWipe` starts at u = -1.25 with the four bands traveling as one cluster (lags 0/.03/.06/.09), so frame 0 already shows sky, red and gold ribbons crossing the frame.
2. [beats 31-44] The Opportunity Card's logo mark sat on top of "OPPORTUNITY", and the fine print below the card crowded the caption pill. -> Fixed: mark scaled 0.42 -> 0.27 and moved into the top-right corner; card raised 52 px.
3. [all beats] Captions split mid-phrase at 25 characters ("Message AGH German" / "Pathway today."). -> Fixed: captions are grouped by sentence, and only sentences longer than 34 characters split into balanced parts. Pill font auto-fits to the longest group (≤ 900 px).

Checks failed: hook (frame 0).
Verdict: ANOTHER ROUND

## Round 2
| hook | read | motion | variety | brand | sync | min |
|  8   |  7   |   8    |    7    |   8   |  7   |  7  |

Worst three:
1. [beats 39-44] "Requirements apply." appeared twice, as fine print under the card and in the caption pill directly below it. -> Fixed: the fine print is now a navy-and-gold "REQUIREMENTS APPLY" sticker that stamps across the card's bottom-right edge on the word, so the caption is the only line of running text.
2. [beats 21-28] Hamburg sat still for about 3 s after the route finished drawing. -> Fixed: two light pulses run the route (u 22.6, 24.6) and gold rings radiate from "Your plans" (u 23.2, 24.2, 26.2), each with a blip.
3. [beats 54-56] The gold flood out of the progress bar read as a flat yellow box at mid-transition. -> Fixed: the brand ribbons sweep the film shut (same motif as the opening) and the logo's own ribbons rise right after.

Also: chips 40 -> 44 px, checklist 52 -> 60 px, zoom-through flash peak 0.95 -> 0.8, end-card block lowered 50 px.
Checks failed: none. Sync: 24/38 hits within 20 ms. The misses are whooshes and swells, whose peaks are broad by design, plus hits stacked within 0.1 beat of a score impact.
Verdict: ANOTHER ROUND

## Round 3 (frames pulled from the encoded final.mp4)
| hook | read | motion | variety | brand | sync | min |
|  8   |  8   |   8    |    8    |   8   |  8   |  8  |

Evidence: beat 0 opens mid-sweep on the brand ribbons. At phone size every headline, chip, checklist row and caption is readable inside the safe area. Each scene enters differently: rise, slam, whip, drop, card flip, pop, logo build. The shots are joined by four different transitions (ribbon wipe, zoom-through, card flip, ribbon wipe back to paper). Colours come from the logo art and the posters, with one display face (Montserrat) and one UI face (Inter). Sync: 25/38 hits within 20 ms (median 8.5 ms); the rest are broad whooshes/swells. Mix: −14.0 LUFS / −1.1 dBTP, and VO windows sit about 3 LU above the music-only windows.

Remaining weakest three (not blocking):
1. [beats 4-6] About 1 s between "GERMANY?" falling out and the "JOB OFFER" slam carries only the camera push.
2. [beat 28] The warm zoom-through flash peaks at 80% for about 0.3 s. It works in motion but is the one near-blank frame.
3. [beats 55.5-57.5] The end card builds for about 2 s before "AGH" lands. The logo could start 0.5 beat earlier.

Checks failed: none. Longest gap without a new event: beats 4.0-6.1 (1.05 s).
Verdict: READY
