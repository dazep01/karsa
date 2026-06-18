# Pull Request: Fix [object Object] Display, Array Reactivity, Builtin Functions & mod/pangkat Operators

## Branch: `fix/bug-object-display-and-array-ops`

---

## Ringkasan

PR ini memperbaiki 7 bug utama yang ditemukan di KARSA v0.3.1, mencakup masalah tampilan error, reaktivitas array, fungsi bawaan, dan operator aritmatika kata yang tidak dikenali parser.

---

## Bug yang Diperbaiki

### BUG-1: Error/Warning Menampilkan `[object Object]`
**File:** `engine/karsa.standalone.js`

Fungsi `run()` di standalone bundle meneruskan objek error langsung ke `console.error()`, sehingga yang muncul hanyalah `[object Object]` bukan pesan yang bermakna.

**Fix:** Format setiap error menjadi string yang mudah dibaca sebelum ditampilkan, termasuk kode error, baris, kolom, pesan, dan saran perbaikan.

### BUG-2: `sisipkan` Tidak Memicu Reaktivitas
**File:** `compiler/emitters/statements.js`

`SisipkanStatement` menghasilkan `arr.value.push(val)` yang bermutasi array in-place. Proxy setter KARSA hanya terpicu saat `.value` di-assign nilai baru, sehingga UI tidak memperbarui.

**Fix:** Tambahkan spread assignment setelah push:
```javascript
arr.value.push(val); arr.value = [...arr.value];
```

### BUG-3: Fungsi Bawaan Tidak Dikenali sebagai CallExpression
**File:** `resolver/karsa-resolver.js`, `compiler/lower/expression.js`

`panjang(arr)`, `tipeData(x)`, `apakahArray(x)`, dll. sebelumnya gagal dengan error E3001 (identifier tidak dideklarasikan) karena resolver hanya memetakan alias properti (MemberExpression), bukan panggilan fungsi.

**Fix:**
- Tambahkan `BUILTIN_FUNCTIONS` registry di resolver yang memetakan nama fungsi Indonesia ke JS
- Tambahkan `visitCallExpression()` yang mendeteksi dan menandai builtin calls
- Tambahkan `lowerBuiltinCall()` di expression lowering yang menurunkan setiap builtin ke JS yang benar

**Contoh hasil:**
| KARSA | JavaScript |
|-------|-----------|
| `panjang(arr)` | `arr.value.length` |
| `tipeData(x)` | `typeof x` |
| `apakahArray(x)` | `Array.isArray(x)` |
| `keTeks(x)` | `String(x)` |
| `keAngka(x)` | `Number(x)` |
| `apakahKosong(x)` | inline check |
| `gabung(arr, sep)` | `arr.value.join(sep)` |
| `saring(arr, fn)` | `arr.value.filter(fn)` |
| `pilih(arr, fn)` | `arr.value.map(fn)` |
| `urutkan(arr)` | `[...arr.value].sort()` |
| `balik(arr)` | `[...arr.value].reverse()` |
| `temukan(arr, fn)` | `arr.value.find(fn)` |
| `apakahAda(arr, item)` | `arr.value.includes(item)` |

### BUG-4: Mutating Array Methods Tidak Memicu Reaktivitas
**File:** `compiler/lower/expression.js`

Panggilan seperti `arr.push(x)` pada variabel reaktif bermutasi array in-place tanpa memicu Proxy setter, sehingga watcher tidak terpicu.

**Fix:** `lowerMethodCall()` membungkus mutating method calls dalam IIFE yang melakukan spread assignment:
```javascript
// arr.push(x) pada variabel reaktif →
(function() { var __r = arr.value.push(x); arr.value = [...arr.value]; return __r; })()
```

Method yang diperlakukan sebagai mutating: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`.

### BUG-5: Alias Method Indonesia Tidak Ada
**File:** `resolver/karsa-resolver.js`

Tidak ada pemetaan dari nama method Indonesia ke JavaScript. `arr.untukSetiap(fn)` tidak diterjemahkan ke `arr.forEach(fn)`.

**Fix:** Tambahkan `ALIAS_METHOD` registry:
| Indonesia | JavaScript |
|-----------|-----------|
| `untukSetiap` | `forEach` |
| `sisip` | `push` |
| `ambilAkhir` | `pop` |
| `gabung` | `join` |
| `saring` | `filter` |
| `pilih` | `map` |
| `urutkan` | `sort` |
| `balik` | `reverse` |
| `temukan` | `find` |
| `temukanIndeks` | `findIndex` |
| `setiap` | `every` |
| `beberapa` | `some` |
| `isi` | `fill` |
| `potong` | `slice` |
| `sambung` | `concat` |
| `apakahAda` | `includes` |
| `indeksDari` | `indexOf` |
| `indeksTerakhir` | `lastIndexOf` |
| `keTeks` | `toString` |
| `-flat` | `flat` |

### BUG-6: Example Files Menggunakan JS Native, Bukan Fitur KARSA
**Files:** `example/index.ks`, `example/todo-app.html`

Example files menggunakan `langsung:` blocks dan JS native workarounds alih-alih fitur KARSA yang seharusnya sudah tersedia.

**Fix:**
- `index.ks`: Menggunakan `fungsi cekGenap(n):` dengan `mod` operator alih-alih `langsung:` block
- `todo-app.html`: Menggunakan `sisipkan` dan `panjang()` alih-alih JS native
- `todo-app.ks` (baru): Versi KARSA murni dari todo-app

### BUG-7: Operator `mod` dan `pangkat` Tidak Dikenali Parser
**Files:** `lexer/karsa-lexer.js`, `parser/token-types.js`, `parser/binding-powers.js`

`mod` dan `pangkat` diterjemahkan di expression lowering (`ops` map), tetapi bukan token yang dikenali lexer/parser. Akibatnya, `n mod 2` dalam kondisi `jika` gagal dengan E2001.

**Fix:**
- Tambahkan `TK_MOD` dan `TK_PANGKAT` token types
- Tambahkan sebagai keywords di lexer (`KEYWORD_LIST`)
- Tambahkan binding powers: `mod` = multiplicative level (11/10), `pangkat` = exponentiation level (13/12, right-associative)
- Tambahkan ke `INFIX_OPERATOR_TOKENS` dan `operatorFromToken()`

**Contoh hasil:**
```karsa
jika n mod 2 sama dengan 0:    →    if ((n % 2) === 0) {
data x = 2 pangkat 10          →    const x = __createReactive((2 ** 10));
```

---

## File yang Diubah

| File | Perubahan |
|------|-----------|
| `resolver/karsa-resolver.js` | +ALIAS_METHOD, +BUILTIN_FUNCTIONS, +visitCallExpression, modified visitMemberExpression & visitIdentifier |
| `compiler/lower/expression.js` | +lowerCallExpression, +lowerBuiltinCall, +lowerMethodCall, +isObjectReactive, +MUTATING_ARRAY_METHODS |
| `compiler/emitters/statements.js` | SisipkanStatement spread reactivity fix |
| `compiler/emitters/runtime.js` | +3 runtime helper functions (__karsa_panjang, __karsa_apakahKosong, __karsa_apakahAda) |
| `engine/karsa.standalone.js` | Rebuilt with all fixes; run() error formatting |
| `lexer/karsa-lexer.js` | +TK_MOD, +TK_PANGKAT in TT and KEYWORD_LIST |
| `parser/token-types.js` | +TK_MOD, +TK_PANGKAT, updated INFIX_OPERATOR_TOKENS and exports |
| `parser/binding-powers.js` | +binding powers for TK_MOD and TK_PANGKAT, +operatorFromToken entries |
| `example/index.ks` | Rewritten with fungsi+mod instead of langsung: |
| `example/todo-app.html` | Uses sisipkan/panjang() instead of JS workarounds |
| `example/todo-app.ks` | NEW: pure KARSA version of todo-app |
| `tester/snapshots/compiler/*.snap.js` | Updated (8 files) after runtime helpers changed output format |

---

## Testing

Semua 313+ test lulus tanpa kegagalan:

- ✅ Lexer tests: 61/61
- ✅ Parser tests: 95/95
- ✅ Compiler tests: 105/105
- ✅ Compiler snapshots: 8/8
- ✅ Resolver tests: 3/3
- ✅ Analyzer tests: 6/6
- ✅ Runtime behavior tests: 3/3
- ✅ Pipeline integration test: PASSED
- ✅ Standalone smoke test: PASSED
- ✅ Language server test: PASSED
- ✅ VS Code extension test: PASSED
- ✅ All .ks example files compile successfully

---

## Cara Push

```bash
cd karsa
git push origin fix/bug-object-display-and-array-ops
```

Kemudian buat Pull Request di GitHub dari branch `fix/bug-object-display-and-array-ops` ke `main`.
