# Hướng dẫn Deploy QuizTug lên Render

Tài liệu này hướng dẫn đưa ứng dụng QuizTug (Node.js + Express + PostgreSQL + WebSocket) lên [Render](https://render.com).

---

## 1. Chuẩn bị

- Tài khoản [Render](https://render.com) (có thể dùng bản miễn phí).
- Repo QuizTug đã đẩy lên **GitHub**, **GitLab** hoặc **Bitbucket**.
- Ứng dụng đã cấu hình:
  - Đọc `process.env.PORT` (đã có trong `server/index.ts`).
  - Biến môi trường: `SESSION_SECRET` (khuyến nghị). `DATABASE_URL` **tùy chọn**: nếu không set, app dùng lưu trong bộ nhớ (dữ liệu mất khi restart). Để lưu lâu dài, dùng Postgres và set `DATABASE_URL`.

---

## 2. Tạo PostgreSQL trên Render

1. Vào [Dashboard Render](https://dashboard.render.com) → **New** → **Postgres**.
2. Chọn **Region** (nên chọn cùng region với Web Service để dùng Internal URL).
3. Đặt **Name** (ví dụ: `quiztug-db`).
4. Chọn **Instance type** (Free tier nếu dùng thử).
5. Bấm **Create Database**.
6. Đợi trạng thái **Available**.
7. Vào trang database → **Connect** → copy **Internal Database URL** (dùng cho Web Service cùng region).

Lưu ý: Nếu Web Service và database **cùng region**, dùng **Internal URL** để giảm độ trễ.

---

## 3. Tạo Web Service (deploy app)

1. Dashboard → **New** → **Web Service**.
2. **Connect** repo chứa QuizTug (GitHub/GitLab/Bitbucket).
3. Chọn repo và branch (thường `main` hoặc `master`).

### Cấu hình Web Service

| Mục | Giá trị |
|-----|--------|
| **Name** | `quiztug` (hoặc tên bạn muốn) |
| **Region** | Cùng region với Postgres (ví dụ: Oregon) |
| **Runtime** | **Node** |
| **Build Command** | Có DB: `npm install && npm run build && npm run db:push`. Không dùng DB: `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | Free (hoặc trả phí nếu cần) |

Giải thích:
- **Build Command**: Cài dependency, build client + server, rồi đồng bộ schema DB bằng Drizzle (`db:push`). `DATABASE_URL` phải được set trước (xem bước 4).
- **Start Command**: Chạy `node dist/index.cjs` (đúng với script `start` trong `package.json`).

---

## 4. Biến môi trường (Environment Variables)

Trong trang Web Service → **Environment** thêm:

| Key | Value | Ghi chú |
|-----|--------|--------|
| `DATABASE_URL` | *(Internal Database URL từ bước 2)* | Bắt buộc. Có thể thêm từ Render: chọn "Add Environment Variable" → "Add from Render Postgres" nếu đã link DB. |
| `SESSION_SECRET` | Chuỗi bí mật bất kỳ (dài, random) | Bắt buộc cho session. Ví dụ: `openssl rand -hex 32` |
| `NODE_ENV` | `production` | Thường Render đã set sẵn; nếu chưa thì thêm. |

**Link database với Web Service (nên dùng):**

- Trong form tạo Web Service, phần **Environment** có thể chọn **Add from Render Postgres** → chọn database đã tạo → Render tự thêm `DATABASE_URL`.
- Hoặc copy Internal URL từ trang Postgres và paste vào giá trị của `DATABASE_URL`.

---

## 5. Deploy

1. Sau khi điền Build/Start command và env, bấm **Create Web Service**.
2. Render sẽ:
   - Clone repo
   - Chạy Build Command (install → build → db:push)
   - Chạy Start Command
3. Khi deploy thành công, app chạy tại URL dạng: `https://quiztug.onrender.com` (tên thay theo tên service của bạn).

Mỗi lần push lên branch đã kết nối, Render sẽ tự build và deploy lại.

---

## 6. Lưu ý quan trọng

### Port

- Ứng dụng **phải** lắng nghe trên `process.env.PORT`. QuizTug đã dùng đúng trong `server/index.ts`:
  ```ts
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen({ port, host: "0.0.0.0", ... });
  ```

### Node.js version

- Render dùng Node 22 mặc định. QuizTug có `.nvmrc` với `20` → Render sẽ đọc và dùng Node 20 nếu hỗ trợ (hoặc bạn có thể chỉnh `.nvmrc` / `engines` trong `package.json` cho đúng bản bạn cần).

### Free tier

- **Web Service free**: Sau ~15 phút không có request, service sẽ "ngủ"; request đầu tiên sau đó có thể chậm (cold start).
- **Postgres free**: Có giới hạn dung lượng và thời gian lưu; phù hợp để thử nghiệm.

### WebSocket

- Render hỗ trợ WebSocket trên Web Service. Ứng dụng dùng cùng một port (HTTP + WS) nên không cần cấu hình thêm cho WS.

### Lỗi build / runtime

- **Build fail**: Xem **Logs** tab của Web Service; thường do thiếu `DATABASE_URL` lúc build (khi chạy `db:push`) hoặc lỗi TypeScript/build.
- **Runtime fail**: Kiểm tra Logs; thường do thiếu `DATABASE_URL` hoặc `SESSION_SECRET`, hoặc không kết nối được DB (sai URL/region).

---

## 7. Tóm tắt nhanh

1. Tạo **Postgres** trên Render, copy **Internal Database URL**.
2. Tạo **Web Service** → kết nối repo QuizTug.
3. **Build Command**: `npm install && npm run build && npm run db:push`
4. **Start Command**: `npm start`
5. **Environment**: `DATABASE_URL` (Internal URL), `SESSION_SECRET` (chuỗi bí mật).
6. Deploy và mở URL Render cung cấp.

Tài liệu gốc Render:
- [Deploy a Node Express App](https://render.com/docs/deploy-node-express-app)
- [Create and Connect to Render Postgres](https://render.com/docs/databases)
