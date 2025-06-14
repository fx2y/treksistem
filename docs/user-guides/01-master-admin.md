### **Panduan Pengguna Treksistem - Bagian 1: Master Admin (Platform Owner)**

#### **Pendahuluan: Peran Anda Sebagai Jantung Ekosistem**

Selamat datang di Treksistem. Anda bukan sekadar administrator; Anda adalah jantung dari ekosistem _ta'awun_ (saling menolong) ini. Visi kami adalah memberdayakan UMKM kuliner di Indonesia dengan alat logistik yang sangat terjangkau, transparan, dan fleksibel. Peran Anda adalah memastikan platform ini berjalan dengan baik, menjaga integritas data, dan yang terpenting, menjadi "konsultan digital" pertama bagi para Mitra pionir kita.

Tujuan utama Anda adalah:

1.  **Menjaga Konsistensi Platform:** Dengan mengelola kategori-kategori global yang akan menjadi "blok bangunan" bagi semua Mitra.
2.  **Memfasilitasi Pertumbuhan:** Dengan melakukan proses _onboarding_ yang _high-touch_ untuk membantu Mitra baru memulai tanpa hambatan teknis.
3.  **Memastikan Keberlanjutan:** Dengan mengawasi model bisnis dan langganan platform.

**Cara Login:** Tidak ada halaman login khusus untuk Admin. Anda cukup login menggunakan akun Google Anda yang telah kami tetapkan secara manual di _database_ dengan _role_ `admin`. Sistem akan secara otomatis mengenali hak akses Anda.

---

#### **1. Mengelola "Blok Bangunan" Global (Global Categories)**

**Konteks:** Bayangkan Anda sedang menyiapkan sebuah toko LEGO. Sebelum anak-anak (Mitra) bisa membangun kreasi mereka, Anda harus menyiapkan jenis-jenis balok dasarnya. Inilah fungsi dari manajemen kategori global. Dengan menyediakan pilihan yang konsisten, kita memastikan data di seluruh platform seragam dan berkualitas. Ini adalah implementasi dari `P-ADM-02` dan `TS-SPEC-007`.

Di dasbor Admin Anda, Anda memiliki kemampuan untuk melakukan operasi **CRUD (Create, Read, Update, Delete)** untuk kategori berikut melalui _endpoint_ `/api/admin/master-data/*`:

- **Jenis Angkutan (Vehicle Types):**

  - **Contoh:** "Motor", "Mobil", "Sepeda".
  - **Tindakan:** Anda bisa menambah jenis angkutan baru, mengubah namanya, dan mengunggah ikon yang sesuai. Ikon ini akan muncul di aplikasi untuk mempermudah identifikasi.

- **Jenis Muatan (Payload Types):**

  - **Contoh:** "Makanan Panas", "Kue Ulang Tahun", "Minuman Botol", "Dokumen Penting".
  - **Tindakan:** Sama seperti angkutan, Anda bisa mengelola daftar muatan yang bisa dilayani oleh Mitra. Ini adalah filter utama bagi pelanggan saat mencari layanan.

- **Jenis Fasilitas (Facilities):**
  - **Contoh:** "Box Pendingin (Cooler Box)", "Tas Termal", "Rak Tambahan".
  - **Tindakan:** Kelola daftar fasilitas tambahan yang bisa ditawarkan oleh layanan pengiriman, lengkap dengan ikonnya.

**Penting (Humility & Imperfection):** Sistem saat ini belum memiliki proteksi canggih. Harap berhati-hati saat menghapus sebuah kategori. Jika sebuah kategori (misal: "Motor") sedang digunakan oleh layanan aktif seorang Mitra, menghapusnya dapat menyebabkan error. Pastikan tidak ada layanan yang bergantung padanya sebelum menghapus.

---

#### **2. Manajemen Mitra & Onboarding "High-Touch"**

**Konteks:** Untuk mengatasi masalah _cold start_, strategi kita adalah menjadi "konsultan digitalisasi gratis" bagi Mitra-mitra pertama. Anda, sebagai Master Admin, memiliki "Super Admin Powers" untuk mengatur akun Mitra secara langsung. Ini adalah implementasi dari strategi _bootstrapping_ di PRD dan fungsionalitas dari `P-ADM-03` & `TS-SPEC-007`.

**Langkah-langkah Onboarding Admin-Led:**

1.  **Mitra Mendaftar:** Arahkan calon Mitra untuk mendaftar di platform menggunakan akun Google mereka. Proses ini akan secara otomatis membuat entri dasar di tabel `users` dan `mitras`.

2.  **Lihat Daftar Mitra:** Di dasbor Admin, Anda bisa melihat daftar semua Mitra yang terdaftar (`GET /api/admin/mitras`) untuk menemukan Mitra yang baru saja mendaftar.

3.  **Konfigurasi Atas Nama Mitra (On Behalf Of):** Ini adalah kekuatan utama Anda. Menggunakan _endpoint_ khusus `/api/admin/mitras/:mitraId/*`, Anda bisa melakukan:
    - **Membuat Layanan Pengiriman Pertama:** Anda akan membuat layanan pertama untuk mereka. Misalnya, "Kurir Makanan Siang - Warung Bu Ani".
    - **Mengatur Detail Layanan:** Anda akan mengkonfigurasi nama layanan, model bisnis (internal atau publik), dan yang terpenting, **skema tarif** (misal: biaya dasar Rp 5.000 + Rp 2.000/km).
    - **Menghubungkan "Blok Bangunan":** Anda akan memilih jenis angkutan ("Motor") dan muatan ("Makanan Panas") yang sesuai untuk layanan tersebut dari daftar global yang telah Anda buat.
    - **Mengundang Driver Pertama:** Anda akan meminta email driver internal mereka dan mengundangnya ke platform atas nama Mitra.

**Prinsip Transparansi & Kepercayaan:** Setiap tindakan yang Anda lakukan atas nama Mitra akan dicatat dalam _log_ audit sistem. Ini memastikan akuntabilitas penuh dan membangun kepercayaan dengan Mitra kita.

---

#### **3. Pengawasan Billing & Langganan**

**Konteks:** Untuk menjaga agar Treksistem bisa terus berjalan dan berkembang dengan biaya sangat rendah bagi UMKM, platform ini harus berkelanjutan secara finansial. Peran Anda adalah mengawasi proses ini, yang di MVP ini masih bersifat semi-manual untuk menekan biaya. Ini adalah implementasi dari `RFC-015` dan `TS-SPEC-017`.

**Alur Konfirmasi Pembayaran (Model QRIS):**

Model bisnis kita adalah biaya tetap per driver aktif per bulan (misal: Rp 10.000/driver/bulan).

1.  **Mitra Melakukan Pembayaran:** Mitra akan melihat tagihan di portal mereka dan melakukan pembayaran via transfer atau scan QRIS ke rekening platform.

2.  **Notifikasi Eksternal:** Anda akan menerima notifikasi pembayaran ini di luar sistem Treksistem (misalnya, notifikasi dari aplikasi mobile banking Anda).

3.  **Konfirmasi Manual di Dasbor Admin:**

    - Masuk ke dasbor Admin Treksistem.
    - Cari Mitra yang bersangkutan dan tagihan mereka yang berstatus "pending".
    - Klik tombol **"Konfirmasi Pembayaran"** atau sejenisnya.

4.  **Sistem Bekerja Otomatis:** Setelah Anda menekan tombol konfirmasi, sistem akan secara otomatis:
    - Mengubah `subscriptionStatus` Mitra menjadi `active`.
    - Menyesuaikan `activeDriverLimit` (jumlah maksimal driver yang bisa mereka miliki) sesuai dengan paket yang mereka bayar.

**Prinsip Ultra Low-Cost:** Proses semi-manual ini adalah pilihan sadar. Ini memungkinkan kita untuk tidak bergantung pada _payment gateway_ mahal di fase awal, sehingga biaya langganan untuk Mitra bisa ditekan serendah mungkin. Ini adalah wujud nyata dari prinsip _ta'awun_ dan "friction as a feature".
