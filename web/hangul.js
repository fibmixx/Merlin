// Approximate Revised Romanization of Korean, with the most common sound changes
// (liaison, nasalization, ㄹ assimilation). Good enough as a pronunciation hint.
(function (global) {
  const INITIALS = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
  const VOWELS = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
  // Final consonant as pronounced at the end of a syllable
  const FINALS = ["", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l", "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];
  // When the next syllable starts with silent ㅇ: [what stays, what moves over]
  const LIAISON = [
    ["", ""], ["", "g"], ["", "kk"], ["k", "s"], ["", "n"], ["n", "j"], ["", "n"], ["", "d"], ["", "r"],
    ["l", "g"], ["l", "m"], ["l", "b"], ["l", "s"], ["l", "t"], ["l", "p"], ["", "r"], ["", "m"], ["", "b"],
    ["p", "s"], ["", "s"], ["", "ss"], ["ng", ""], ["", "j"], ["", "ch"], ["", "k"], ["", "t"], ["", "p"], ["", ""]
  ];
  const NASAL = { k: "ng", t: "n", p: "m" };

  function decompose(ch) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) return null;
    return { l: Math.floor(code / 588), v: Math.floor((code % 588) / 28), t: code % 28 };
  }

  function romanize(text) {
    if (!text) return "";
    const chars = Array.from(text);
    const syl = chars.map(decompose);
    let out = "";
    let carry = null; // initial override for the current syllable
    for (let i = 0; i < chars.length; i++) {
      const s = syl[i];
      if (!s) { out += chars[i]; carry = null; continue; }
      let initial = carry !== null ? carry : INITIALS[s.l];
      carry = null;
      // ㄹ at the very start of a word reads closer to "r"; after a vowel stays "r"
      let final = FINALS[s.t];
      const next = syl[i + 1];
      if (next && s.t) {
        if (next.l === 11) {               // next starts with silent ㅇ → liaison
          const [stay, move] = LIAISON[s.t];
          final = stay; carry = move;
        } else if (next.l === 2 || next.l === 6) { // before ㄴ / ㅁ → nasalization
          if (NASAL[final]) final = NASAL[final];
          if (final === "l" && next.l === 2) carry = "l"; // ㄹ + ㄴ → ll
        } else if (next.l === 5) {         // before ㄹ
          if (final === "l") carry = "l";
          else if (final === "n") { final = "l"; carry = "l"; }
          else { if (NASAL[final]) final = NASAL[final]; carry = "n"; }
        } else if (s.t === 27 || s.t === 6 || s.t === 15) { // ㅎ before ㄱ/ㄷ/ㅈ → aspiration
          const asp = { 0: "k", 3: "t", 12: "ch" }[next.l];
          if (asp) { final = s.t === 27 ? "" : FINALS[s.t]; carry = asp; }
        }
      }
      out += initial + VOWELS[s.v] + final;
    }
    return out;
  }

  function hasHangul(text) { return /[ᄀ-ᇿ㄰-㆏가-힣]/.test(text || ""); }

  global.Hangul = { romanize, hasHangul };
})(window);
