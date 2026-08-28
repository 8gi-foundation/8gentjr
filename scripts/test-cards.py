#!/usr/bin/env python3
"""
Headless tap-every-card regression test.

For each AAC surface (Talk home + category tabs + QuickPhrases + Builder),
click every card/button and verify that one of:
  - /api/tts was requested (ElevenLabs path)
  - window.speechSynthesis.speak() was invoked (Web Speech fallback)
…fired within 2s. If neither, the card is "silent" and flagged.

Run:
  TARGET=https://8gentjr.com python3 scripts/test-cards.py
  TARGET=http://localhost:3000 python3 scripts/test-cards.py
"""
import asyncio
import os
import sys
from playwright.async_api import async_playwright

TARGET = os.environ.get("TARGET", "https://8gentjr.com")
WAIT_MS = 1500


INSTRUMENT = """
() => {
  window.__tts = { speakCalls: [], audioPlays: [] };
  const origSpeak = window.speechSynthesis?.speak?.bind(window.speechSynthesis);
  if (origSpeak) {
    window.speechSynthesis.speak = (u) => {
      window.__tts.speakCalls.push({ text: u?.text, at: Date.now() });
    };
  }
  // Track HTMLAudioElement.play() calls — this is how the ElevenLabs
  // cached-blob path actually produces sound.
  const origPlay = HTMLAudioElement.prototype.play;
  HTMLAudioElement.prototype.play = function() {
    window.__tts.audioPlays.push({ src: this.src?.slice(0, 40), at: Date.now() });
    return origPlay.apply(this, arguments);
  };
}
"""


SEED_SETTINGS = {
    "childName": "TestKid",
    "primaryColor": "#4CAF50",
    "selectedVoiceId": None,
    "ttsRate": 1.0,
    "ttsVolume": 1.0,
    "gridColumns": 3,
    "hasCompletedOnboarding": True,
    "glpStage": 3,
    "accountType": "self_13_plus",
    "birthYear": 2005,
    "isChild": False,
    "carerRelationship": None,
    "guardianConfirmed": True,
    "parentEmailConfirmed": True,
    "gatedAt": "2026-04-22T00:00:00.000Z",
}


async def test_surface(page, url, surface_name):
    print(f"\n=== {surface_name}  {url}")
    await page.goto(url, wait_until="domcontentloaded")
    await page.wait_for_timeout(800)
    await page.evaluate(INSTRUMENT)

    # Harvest every button-like element with aria-label
    cards = await page.evaluate("""
      () => {
        const sel = 'button[aria-label], [role="button"][aria-label]';
        return Array.from(document.querySelectorAll(sel)).map((el, i) => ({
          i,
          label: el.getAttribute('aria-label'),
          visible: !!(el.offsetParent || el === document.activeElement),
        })).filter(c => c.visible);
      }
    """)

    # Filter to AAC-like cards (skip nav, menu, pagination dots)
    skip_tokens = {"skip", "back", "home", "menu", "close", "play", "go to page",
                   "previous", "next", "toggle", "sign in", "sign up",
                   "remove ", "dismiss suggestion", "more options",
                   "clear", "delete", "edit", "settings", "change ", "open ",
                   "choose ", "expand ", "collapse ", "filter", "search"}
    def is_card(c):
        lab = (c["label"] or "").lower()
        if not lab or len(lab) > 40:
            return False
        return not any(tok in lab for tok in skip_tokens)

    targets = [c for c in cards if is_card(c)]
    print(f"  {len(targets)} candidate cards")

    results = []
    for idx, c in enumerate(targets):
        await page.evaluate("window.__tts.speakCalls = []; window.__tts.audioPlays = [];")
        try:
            label = c["label"].replace('"', '\\"')
            handle = await page.evaluate_handle(
                'sel => Array.from(document.querySelectorAll(\'button[aria-label], [role="button"][aria-label]\')).find(el => el.getAttribute("aria-label") === sel && el.offsetParent)',
                c["label"],
            )
            el = handle.as_element()
            if not el:
                results.append({"label": c["label"], "status": "not_found", "err": "gone after DOM change"})
                continue
            await el.evaluate("el => el.scrollIntoView({block: 'center'})")
            await el.click(force=True, timeout=1500)
        except Exception as e:
            results.append({"label": c["label"], "status": "click_failed", "err": str(e)[:80]})
            continue
        await page.wait_for_timeout(WAIT_MS)
        state = await page.evaluate(
            "() => ({speak: window.__tts.speakCalls.length, audio: window.__tts.audioPlays.length})"
        )
        ok = state["speak"] > 0 or state["audio"] > 0
        results.append({
            "label": c["label"], "status": "ok" if ok else "SILENT",
            "speak": state["speak"], "audio": state["audio"],
        })
        mark = "OK " if ok else "!!!"
        print(f"  [{idx+1:>3}/{len(targets)}] {mark}  audio={state['audio']} speak={state['speak']}  {c['label']!r}")

    return results


async def main():
    all_results = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            viewport={"width": 390, "height": 844},  # iPhone
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
            has_touch=True,
        )
        import json as _json
        await ctx.add_init_script(
            f"try {{ localStorage.setItem('8gentjr-app-settings', JSON.stringify({_json.dumps(SEED_SETTINGS)})); }} catch {{}}"
        )
        page = await ctx.new_page()
        page.on("console", lambda msg: None)  # silence

        surfaces = [
            ("Talk home", f"{TARGET}/talk"),
            ("Talk core", f"{TARGET}/talk/core"),
            ("Talk builder", f"{TARGET}/talk/builder"),
            ("Quick phrases", f"{TARGET}/suggestions"),
        ]
        for name, url in surfaces:
            try:
                all_results[name] = await test_surface(page, url, name)
            except Exception as e:
                print(f"  surface failed: {e}")
                all_results[name] = [{"label": "<surface-error>", "status": "error", "err": str(e)}]
        await browser.close()

    # Summary
    print("\n\n==================  SUMMARY  ==================")
    total = 0
    silent = 0
    for name, results in all_results.items():
        okc = sum(1 for r in results if r.get("status") == "ok")
        sil = sum(1 for r in results if r.get("status") == "SILENT")
        fail = sum(1 for r in results if r.get("status") not in ("ok", "SILENT"))
        total += len(results)
        silent += sil
        print(f"  {name:<18} {okc:>3}/{len(results)} ok   {sil:>2} silent   {fail:>2} errors")
        for r in results:
            if r.get("status") != "ok":
                print(f"      - {r.get('status'):>12}  {r.get('label')!r}  {r.get('err','')}")

    print(f"\nTOTAL: {total - silent}/{total} ok, {silent} silent")
    if silent > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
