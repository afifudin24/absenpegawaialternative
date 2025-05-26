import React, { useState, useEffect, useRef } from "react";
import './App.css';

const OFFICE_COORDS = {
  latitude: -7.370147,
  longitude: 108.9013405,
};

function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 3000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function App() {
  const [namaGuru, setNamaGuru] = useState("");
  const [status, setStatus] = useState("");
  const [distance, setDistance] = useState(null);
  const [absenType, setAbsenType] = useState("Masuk");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // 👇 Aktifkan kamera saat komponen dimount
  useEffect(() => {
    const enableCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setStatus("❌ Gagal mengakses kamera: " + err.message);
      }
    };

    enableCamera();

    return () => {
      // Stop kamera saat unmount
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleAbsen = async () => {
    if (!namaGuru.trim()) {
      setStatus("❗ Silakan masukkan nama pegawai terlebih dahulu.");
      return;
    }

    if (!navigator.geolocation) {
      setStatus("❌ Geolocation tidak didukung oleh browser.");
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude, longitude } = position.coords;
      const dist = getDistanceFromLatLonInMeters(
        latitude,
        longitude,
        OFFICE_COORDS.latitude,
        OFFICE_COORDS.longitude
      );

      setDistance(dist.toFixed(2));

      if (!videoRef.current) {
        setStatus("❗ Kamera belum tersedia.");
        return;
      }

      // Ambil gambar dari video
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageBase64 = canvas.toDataURL("image/jpeg");

      const payload = {
        nama_guru: namaGuru,
        latitude,
        longitude,
        jenis_absen: absenType,
        gambar: imageBase64,
      };
      setStatus("Loading .....");
      const res = await fetch("http://absenpegawai.adservices.site/absen.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      

      if (result.success && dist <= 500) {
        setStatus(`✅ Berhasil absen ${absenType}. ${result.message}`);
      } else if (dist > 500) {
        setStatus(`❌ Gagal absen. Anda di luar area kantor.`);
      } else {
        setStatus("❌ Gagal menyimpan absen.");
      }
    } catch (err) {
      setStatus("❌ Error: " + err.message);
    }
  };

  return (
    <div className="min-h-screen w-full bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-md shadow-xl bg-base-100">
        <div className="card-body space-y-4">
          <h2 className="card-title">Absensi Pegawai</h2>

          <div>
            <label className="label">Nama Pegawai</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={namaGuru}
              onChange={(e) => setNamaGuru(e.target.value)}
              placeholder="Masukkan nama pegawai"
            />
          </div>

          <div>
            <label className="label">Jenis Absen</label>
            <select
              className="select select-bordered w-full"
              value={absenType}
              onChange={(e) => setAbsenType(e.target.value)}
            >
              <option value="Masuk">Masuk</option>
              <option value="Pulang">Pulang</option>
            </select>
          </div>

          <button className="btn btn-success" onClick={handleAbsen}>
            Absen Sekarang
          </button>

          {status && (
            <div className="alert mt-2">
              <span>{status}</span>
              {distance && <p>Jarak dari kantor: {distance} meter</p>}
            </div>
          )}

          <div className="mt-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg border"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
