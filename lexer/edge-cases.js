"use strict";
const { tokenize, TT } = require("./karsa-lexer.js");
let ok = true;
function expect(name, cond, d){ if(!cond){ok=false; console.log("  ✗ "+name+(d?" -> "+d:""));} else console.log("  ✓ "+name); }

// 1. Input kosong
let r = tokenize("");
expect("Input kosong -> hanya EOF", r.tokens.length===1 && r.tokens[0].tipe===TT.TK_EOF, JSON.stringify(r.tokens.map(t=>t.tipe)));

// 2. Hanya whitespace
r = tokenize("   \n\n  \n");
expect("Hanya whitespace -> hanya EOF, tanpa error", r.tokens.length===1 && r.errors.length===0, JSON.stringify(r.tokens.map(t=>t.tipe)));

// 3. CRLF line endings
r = tokenize("data x = 0\r\nbuat div\r\n  buat p\r\n");
expect("CRLF -> tidak ada error indentasi", r.errors.length===0, JSON.stringify(r.errors.map(e=>e.kode)));
expect("CRLF -> INDENT/DEDENT seimbang",
  r.tokens.filter(t=>t.tipe===TT.TK_INDENT).length === r.tokens.filter(t=>t.tipe===TT.TK_DEDENT).length);

// 4. CR saja (Mac lama)
r = tokenize("data x = 0\rbuat p\r");
expect("CR-only -> tidak ada error", r.errors.length===0, JSON.stringify(r.errors.map(e=>e.kode)));

// 5. Tanpa newline akhir
r = tokenize("data x = 0");
const last = r.tokens[r.tokens.length-1];
expect("Tanpa newline akhir -> ada BARIS_BARU lalu EOF",
  last.tipe===TT.TK_EOF && r.tokens[r.tokens.length-2].tipe===TT.TK_BARIS_BARU, JSON.stringify(r.tokens.map(t=>t.tipe)));

// 6. CR lalu langsung EOF
r = tokenize("data x = 0\r");
expect("CR di akhir -> tanpa error", r.errors.length===0 && r.tokens[r.tokens.length-1].tipe===TT.TK_EOF);

// 7. Nested function call
r = tokenize("format(angka, 2)");
expect("Pemanggilan native f(x, y)",
  r.tokens.map(t=>t.tipe).join(",") === ["TK_IDENTIFIER","TK_KURUNG_BUKA","TK_IDENTIFIER","TK_KOMA","TK_LITERAL_ANGKA","TK_KURUNG_TUTUP","TK_BARIS_BARU","TK_EOF"].join(","),
  JSON.stringify(r.tokens.map(t=>t.tipe)));

// 8. Property chain a.b.c.d
r = tokenize("a.b.c.d");
expect("Akses properti berantai a.b.c.d",
  r.tokens.map(t=>t.tipe).join(",") === ["TK_IDENTIFIER","TK_TITIK","TK_IDENTIFIER","TK_TITIK","TK_IDENTIFIER","TK_TITIK","TK_IDENTIFIER","TK_BARIS_BARU","TK_EOF"].join(","),
  JSON.stringify(r.tokens.map(t=>t.tipe)));

// 9. Operator aritmatika
r = tokenize("turunan total = harga * jumlah");
expect("Aritmatika: harga * jumlah -> BINTANG",
  r.tokens.some(t=>t.tipe===TT.TK_BINTANG), JSON.stringify(r.tokens.map(t=>t.tipe)));

// 10. Komentar di akhir baris (inline)
r = tokenize('data x = 0 --! komentar');
expect("Komentar inline --! diabaikan",
  r.tokens.some(t=>t.tipe===TT.TK_DATA) && !r.tokens.some(t=>t.nilai==="komentar") && r.errors.length===0,
  JSON.stringify(r.tokens.map(t=>t.nilai)));

// 11. DocString + komentar biasa bercampur
r = tokenize('--! abaikan\n--? simpan ini\nbuat div');
const buat = r.tokens.find(t=>t.tipe===TT.TK_BUAT);
expect("Komentar biasa dilewati, docstring menempel",
  buat && buat.docstring==="simpan ini", JSON.stringify(buat&&buat.docstring));

// 12. Tab di tengah baris (bukan indentasi) -> tidak error E1002
r = tokenize('data x\t= 0');
expect("Tab dalam baris (bukan indent) -> tidak error E1002",
  !r.errors.some(e=>e.kode==="E1002"), JSON.stringify(r.errors.map(e=>e.kode)));

// 13. Karakter tidak dikenal -> E1005
r = tokenize('data x = 0\n@@@\n');
expect("Karakter @ tidak dikenal -> E1005", r.errors.some(e=>e.kode==="E1005"), JSON.stringify(r.errors.map(e=>e.kode)));

// 14. Dedent multiple sekaligus di akhir file
r = tokenize("a\n  b\n    c\n");
const tail = r.tokens.slice(-5).map(t=>t.tipe);
expect("Dedent ganda di EOF",
  r.tokens.filter(t=>t.tipe===TT.TK_DEDENT).length===2 && r.tokens[r.tokens.length-1].tipe===TT.TK_EOF,
  JSON.stringify(tail));

// 15. Huruf Indonesia (aksen)
r = tokenize("data café = 1");
expect("Identifier beraksen 'café'",
  r.tokens[1].tipe===TT.TK_IDENTIFIER && r.tokens[1].nilai==="café", JSON.stringify(r.tokens.map(t=>t.nilai)));

console.log("\n" + (ok ? "✓ Semua edge case lulus" : "✗ Ada edge case gagal"));
process.exit(ok?0:1);
