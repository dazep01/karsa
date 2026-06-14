--! File: halo.ks
data nama = "Arena"
buat h1 -> teks: "Selamat Datang di " + nama
saat nama berubah:
    perbarui teks h1 -> "Selamat Datang di " + nama
    tampilkan pesan "Nama telah berubah!"
