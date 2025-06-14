### **Panduan Pengguna Treksistem - Bagian 2: Mitra (Pemilik Usaha)**

#### **Selamat Datang di Treksistem!**

Selamat! Anda selangkah lebih dekat untuk memiliki sistem logistik digital Anda sendiri, tanpa komisi mahal dan ribet. Kami membangun Treksistem dengan semangat _ta'awun_ (saling menolong) untuk memberdayakan UMKM seperti Anda. Anggap kami sebagai alat bantu Anda, bukan bos Anda. Anda yang memegang kendali penuh.

**Login Mudah:** Untuk masuk, cukup gunakan akun Google yang Anda daftarkan. Tidak perlu mengingat _password_ baru.

---

#### **Panduan Cepat 5 Menit: Onboarding Wizard**

Saat pertama kali Anda _login_, sebuah "Wizard" atau panduan langkah demi langkah akan muncul. Ini adalah jalan tol Anda untuk langsung _go digital_. Ikuti saja panduannya. Ini adalah implementasi dari `TS-SPEC-024`.

- **Langkah 1: Profil Usaha Anda (`TS-SPEC-022`)**

  - **Apa yang harus dilakukan?** Masukkan nama, alamat, dan kontak usaha Anda.
  - **Mengapa ini penting?** Informasi ini akan membantu pelanggan dan driver mengenali Anda. Ini adalah identitas digital usaha Anda.

- **Langkah 2: Buat Layanan Pengiriman Pertama**

  - **Apa yang harus dilakukan?** Sekarang, mari buat "menu" layanan pengiriman Anda. Cukup isi tiga hal sederhana:
    1.  **Nama Layanan:** Contohnya "Pengiriman Katering Harian" atau "Kurir Kue Sameday".
    2.  **Biaya Dasar (_Base Fee_):** Biaya minimal untuk setiap pengiriman.
    3.  **Biaya per KM:** Biaya tambahan untuk setiap kilometer jarak tempuh.
  - **Manfaatnya?** Sistem akan menghitung ongkir secara otomatis dan transparan. Contoh: Jika biaya dasar Rp 5.000 dan per km Rp 2.000, maka pengiriman sejauh 5km akan otomatis dihitung menjadi **Rp 15.000**. Jelas untuk Anda, jelas untuk pelanggan!

- **Langkah 3: Undang Driver Pertama Anda (`TS-SPEC-009`)**
  - **Apa yang harus dilakukan?** Masukkan alamat email driver andalan Anda. Sistem akan mengirimkan undangan agar mereka bisa bergabung dengan tim Anda di aplikasi driver.
  - **Catatan:** Tergantung paket langganan Anda, ada batas jumlah driver yang bisa ditambahkan. Ini cara kami menjaga platform tetap terjangkau.

---

#### **Dasbor Anda: Pusat Kendali Operasi**

Setelah selesai dengan Wizard, Anda akan masuk ke Dasbor utama. Anggap ini sebagai "command center" atau pusat kendali operasi harian Anda. Semua informasi penting ada di sini secara _real-time_ (`TS-SPEC-018`, `TS-SPEC-021`).

- **Sekilas Info:** Anda akan melihat ringkasan seperti "Pesanan Aktif", "Selesai Hari Ini", dan "Driver yang Bertugas".
- **Daftar Pesanan Terbaru:** Di bawahnya, ada daftar semua pesanan. Anda bisa dengan cepat melihat ID Order, nama pelanggan, driver yang ditugaskan, status terakhir, dan total biayanya.

---

#### **Mengelola Layanan Anda (Your "Digital Menu" for Deliveries)**

Di sinilah letak kekuatan utama Treksistem. Anda bisa mengatur layanan pengiriman sesuai kebutuhan unik bisnis Anda. Buka halaman "Layanan" (`Services`) untuk mulai (`TS-SPEC-008`).

- **Publik vs. Privat (Penting!)**

  - **Publik:** Pilih ini jika Anda ingin layanan Anda muncul di halaman web publik Treksistem. Ini membuka peluang bagi pelanggan baru untuk menemukan dan memesan langsung dari Anda.
  - **Privat:** Pilih ini untuk layanan internal. Sempurna untuk **mencatat pesanan yang masuk lewat telepon atau WhatsApp**. Anda tetap bisa menggunakan semua fitur pelacakan canggih kami, tapi hanya untuk order yang Anda masukkan sendiri.

- **Detail Lainnya:**
  - **Jangkauan:** Atur jarak maksimal pengiriman Anda (misal: 15 km).
  - **Opsi Kendaraan & Muatan:** Pilih jenis kendaraan (Motor/Mobil) dan tipe barang (Makanan/Kue/Dokumen) yang bisa diantar oleh layanan ini.

---

#### **Mengelola Tim Anda: Driver & Kendaraan**

Bisnis Anda berjalan karena tim dan aset Anda. Di Treksistem, Anda bisa mengelolanya dengan mudah.

- **Manajemen Driver (`TS-SPEC-009`)**

  - Buka halaman "Driver".
  - Di sini Anda bisa mengundang driver baru via email, melihat status mereka (`Aktif`, `Non-Aktif`, `Sedang Bertugas`), dan jika perlu, memberhentikan driver dari tim Anda.

- **Manajemen Kendaraan (`TS-SPEC-014`)**
  - **Manfaat:** Gunakan fitur ini untuk mencatat semua kendaraan operasional Anda. Ini sangat berguna agar tidak pusing saat ada urusan seperti **tilang elektronik (ETLE)**!
  - Buka halaman "Kendaraan" (`Vehicles`).
  - Cukup klik "Tambah Kendaraan" dan masukkan **Nomor Polisi (Nopol)** beserta deskripsi singkatnya (misal: "Vario Putih 2021").

---

#### **Operasional Harian: Mencatat & Mengirim Pesanan**

Ini adalah alur kerja harian Anda. Ada dua cara pesanan masuk ke sistem.

- **Alur 1: Entri Pesanan Manual (Untuk Order via Telepon/WA)**

  - Ini adalah fitur **"Logbook Digital"** Anda (`TS-SPEC-013`), pengganti buku catatan kertas yang sering hilang atau salah tulis.

  1.  Di dasbor, klik **"Buat Pesanan"**.
  2.  Isi formulir: nama & kontak pelanggan, lalu masukkan alamat. Anda bisa memasukkan **beberapa alamat sekaligus**, misalnya 1 alamat penjemputan dan 2 alamat pengantaran untuk pesanan katering.
  3.  Sistem akan otomatis menghitung total ongkirnya.
  4.  Anda bisa langsung menugaskan driver dan kendaraan spesifik jika mau.
  5.  **Langkah Ajaib:** Setelah order dibuat, sistem akan memberikan Anda sebuah **Link Pelacakan (Tracking Link)**. Salin link ini dan kirimkan ke pelanggan Anda via WhatsApp. Pelanggan Anda pasti akan sangat terkesan dengan pelacakan profesional ini!

- **Alur 2: Pesanan Otomatis & Pengiriman (Dispatching)**
  - Jika layanan Anda bersifat "Publik", pesanan dari pelanggan baru akan otomatis muncul di dasbor dengan status `pending_dispatch` (menunggu driver).
  - **Model Broadcast-to-Claim (`TS-SPEC-016`):** Saat ada pesanan baru, sistem akan otomatis **"menyiarkannya"** ke semua driver Anda yang sedang aktif. Driver pertama yang menerima (klaim) pekerjaan tersebut akan mendapatkan ordernya. Cepat, adil, dan efisien. Anda bisa memantau semuanya dari dasbor.

---

#### **Fitur Unggulan: Akuntabilitas & Kepercayaan**

Dua fitur ini adalah pembeda utama yang akan membuat pelanggan Anda semakin loyal.

- **Logbook Digital (`TS-SPEC-015`)**

  - Bingung siapa yang pakai motor N 1234 ABC kemarin jam 2 siang? Buka halaman "Logbook", filter berdasarkan tanggal dan nopol, dan Anda akan melihat riwayat lengkapnya dalam hitungan detik.

- **Pelacakan Transparan dengan Bukti Foto**
  - Ingat _Tracking Link_ tadi? Pelanggan Anda tidak hanya melihat status "diantar", tapi juga bisa melihat **bukti foto** yang diunggah driver saat mengambil barang dan saat menyerahkannya. Ini membangun kepercayaan yang luar biasa dan mengurangi risiko "gagal COD" atau salah paham.

---

#### **Tagihan (Billing)**

Kami percaya keuntungan Anda adalah milik Anda. Model bisnis kami sederhana dan transparan (`TS-SPEC-017`).

- **Prinsip Kami:** Kami **tidak mengambil komisi** dari setiap transaksi Anda. Anda hanya membayar biaya tetap bulanan yang sangat terjangkau untuk setiap _driver_ yang aktif di tim Anda.
- **Cara Bayar:** Buka halaman "Tagihan" (`Billing`). Anda akan melihat daftar tagihan. Cukup klik "Bayar" lalu **scan kode QRIS** yang muncul dengan aplikasi M-Banking atau e-wallet apa pun. Mudah dan cepat.
