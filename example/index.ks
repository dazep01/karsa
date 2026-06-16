--! index.ks - Aplikasi Counter Reaktif dengan KARSA

langsung:
  function cekGenap(n) {
    return n % 2 === 0 ? "Genap" : "Ganjil";
  }

data counter = 0
data nama_pengguna = "Kawan"

turunan status_counter = jalankan cekGenap dengan counter
turunan pesan_selamat = "Halo, " + nama_pengguna + "!"

buat div.app-container
  buat h1#judul -> teks: pesan_selamat

  buat div.counter-box
    buat p#nilai-text.text-bold -> teks: "Nilai saat ini: " + counter
    buat p#status-text -> teks: "Status angka: " + status_counter

    buat tombol#btn-tambah -> teks: "Tambah Angka"
      ketika diklik -> tambahkan 1 ke counter

    buat tombol#btn-reset -> teks: "Reset"
      ketika diklik -> simpan 0 ke counter

saat counter berubah:
  perbarui teks "#nilai-text" -> "Nilai saat ini: " + counter
  perbarui teks "#status-text" -> "Status angka: " + status_counter

saat pesan_selamat berubah:
  perbarui teks "#judul" -> pesan_selamat
