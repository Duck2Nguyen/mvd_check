# Kiểm tra trạng thái vận đơn SPX

Website đơn giản để kiểm tra trạng thái nhiều mã vận đơn SPX cùng lúc.

## 🚀 Demo

Truy cập: [GitHub Pages URL của bạn]

## ✨ Tính năng

- ✅ Kiểm tra nhiều mã vận đơn cùng lúc
- ✅ Giao diện đẹp, responsive
- ✅ Hiển thị trạng thái chi tiết
- ✅ Thống kê kết quả (thành công/thất bại)
- ✅ Bypass CORS tự động

## 📦 Cách sử dụng

1. Nhập danh sách mã vận đơn (mỗi mã một dòng)
2. Nhấn nút "Kiểm tra"
3. Xem kết quả trạng thái của từng đơn

## 🛠️ Deploy lên GitHub Pages

### Bước 1: Tạo Repository
```bash
cd c:\Users\Admin\Desktop\mvd_check
git init
git add .
git commit -m "Initial commit"
```

### Bước 2: Push lên GitHub
```bash
# Tạo repo mới trên GitHub (ví dụ: mvd-tracker)
git remote add origin https://github.com/USERNAME/mvd-tracker.git
git branch -M main
git push -u origin main
```

### Bước 3: Bật GitHub Pages
1. Vào **Settings** của repository
2. Chọn **Pages** ở menu bên trái
3. Trong **Source**, chọn **main** branch
4. Nhấn **Save**
5. Sau vài phút, trang sẽ có tại: `https://USERNAME.github.io/mvd-tracker/`

## 🔧 Xử lý CORS

Nếu gặp lỗi CORS, mở file `script.js` và thay đổi `PROXY_INDEX`:

```javascript
const PROXY_INDEX = 0;  // Dùng allorigins.win
const PROXY_INDEX = 1;  // Dùng corsproxy.io
const PROXY_INDEX = 2;  // Gọi trực tiếp (có thể bị CORS)
```

## 📝 API được sử dụng

SPX Vietnam Public API:
```
https://spx.vn/shipment/order/open/order/get_order_info?spx_tn={TRACKING_CODE}&language_code=vi
```

## 🎨 Công nghệ

- HTML5
- CSS3 (Gradient design)
- Vanilla JavaScript (ES6+)
- CORS Proxy (allorigins.win)

## 📄 License

MIT License - Tự do sử dụng cho mục đích cá nhân và thương mại.
