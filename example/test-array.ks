--! test-array.ks - Test Array Operations

data kumpulanNilai = []
data totalNilai = 0

buat div.container
  buat h1 -> teks: "Test Array KARSA"
  
  buat div.input-section
    buat masukan#input-nilai -> tipe: "number", placeholder: "Masukkan nilai"
    buat tombol#btn-tambah -> teks: "Tambah Nilai"
      ketika diklik:
        ambil nilai dari "#input-nilai" -> simpan ke nilaiBaru
        sisipkan Number(nilaiBaru) ke kumpulanNilai
        tambahkan Number(nilaiBaru) ke totalNilai
        kosongkan "#input-nilai"
  
  buat div.result-section
    buat p#total-text -> teks: "Total: " + totalNilai
    buat p#jumlah-item -> teks: "Jumlah item: " + ukuran(kumpulanNilai)
    
    buat ul#daftar-nilai
      ulangi nilai dari kumpulanNilai:
        buat li -> teks: "Nilai: " + nilai

saat kumpulanNilai berubah:
  perbarui teks "#jumlah-item" -> "Jumlah item: " + ukuran(kumpulanNilai)
