--! todo-app.ks - Aplikasi Daftar Tugas dengan KARSA
--! Contoh penggunaan operasi array: sisipkan, hapus, panjang()

data semuaTugas = []
data inputSekarang = ""

buat div.container
  buat h2 -> teks: "Daftar Tugasku"

  buat div.input-group
    buat masukan#input-tugas -> tipe: "text", placeholder: "Apa yang ingin dikerjakan?"
    buat tombol#tambah-btn -> teks: "Tambah"
      ketika diklik:
        ambil nilai dari "#input-tugas" -> simpan ke inputSekarang
        jika inputSekarang tidak sama dengan "":
          sisipkan inputSekarang ke semuaTugas
          perbarui nilai "#input-tugas" -> ""

  buat ul#list-tugas

  buat div.info
    buat span -> teks: "Total Tugas: "
    buat span#total-angka -> teks: panjang(semuaTugas)

saat semuaTugas berubah:
  kosongkan "#list-tugas"
  ulangi tugas dari semuaTugas:
    buat li
      buat span -> teks: tugas
      buat tombol.hapus-btn -> teks: "Hapus"
        ketika diklik:
          hapus tugas dari semuaTugas
  perbarui teks "#total-angka" -> panjang(semuaTugas)
