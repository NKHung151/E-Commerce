# Frontend — Novamart

React 18 + React Router 6 + Tailwind CSS. Một bundle chứa hai ứng dụng với phiên đăng nhập riêng:

| URL | Ứng dụng | Dành cho |
|---|---|---|
| `/` | **Cửa hàng**: danh mục, trang sản phẩm, giỏ hàng, thanh toán, đơn hàng, chatbot và gợi ý AI | khách vãng lai, khách hàng |
| `/staff`, `/admin` | **Back office**: tổng quan, đơn hàng (trạng thái, xác nhận thanh toán, vận đơn), sản phẩm, danh mục, người dùng (chỉ admin) | nhân viên, quản trị viên |

Back office được tách bundle (code-split), nên khách mua hàng không phải tải phần này.

## Chạy

```bash
npm install
npm start          # http://localhost:3000, API được proxy tới gateway :8080 ("proxy" trong package.json)
npm run build
```

Trong Docker, bundle được nginx phục vụ; nginx cũng chuyển `/api`, `/recommend`, `/chatbot` và
`/behavior` tới container `gateway` (xem `nginx.conf`). Mọi request đều cùng origin nên không cần cấu
hình CORS hay ghi cứng địa chỉ máy chủ. Chỉ đặt `REACT_APP_GATEWAY_URL` lúc build khi gateway nằm ở
origin khác.

## Cấu trúc

```
src/
  index.js · App.js        điểm vào; App chọn Cửa hàng hay Back office theo tiền tố URL
  config.js                địa chỉ gateway / API
  styles/index.css         các layer Tailwind và vài class component dùng chung

  shared/                  dùng chung cho cả hai ứng dụng, không phụ thuộc ứng dụng nào
    api/client.js          tạo client axios (gắn JWT, làm mới token một lần cho nhiều request), tiện ích phân trang và lỗi
    api/tokens.js          lưu token riêng cho từng ứng dụng, giải mã JWT
    auth/AuthProvider.js   context phiên đăng nhập (useAuth)
    hooks/                 useAsync, useDebounced, useQueryParams (bộ lọc theo URL)
    utils/constants.js     phản chiếu máy trạng thái của backend, phương thức thanh toán, loại sản phẩm
    utils/format.js        định dạng tiền, ngày, địa chỉ, số lượng
    utils/products.js      gắn thông tin sản phẩm vào dòng giỏ hàng và đơn hàng
    ui/                    bộ component giao diện (import từ 'shared/ui'): Button, ô nhập liệu,
                           Card/PageHeader/Avatar, Badge/StatusBadge/Alert, trạng thái tải và rỗng,
                           Pagination, Modal/toast/confirm, ảnh/giá/sao/bộ chọn số lượng sản phẩm,
                           Logo, AuthShell

  shop/                    cửa hàng
    api.js · ShopApp.js · categoryMeta.js
    context/CartContext.js
    layout/                Header, Footer, ShopLayout
    components/            ProductCard, ProductGrid, CatalogFilters, Reviews, OrderSummary,
                           OrderTimeline, ChatWidget
    pages/                 Home, Catalog, Product, Cart, Checkout, Orders, Order, Profile, Auth

  backoffice/              khu vực nhân viên và quản trị
    api.js · BackofficeApp.js
    layout/                Layout, Sidebar
    components/            StatCard, TransitionButtons, ProductCell, UserFormModal
    pages/                 Dashboard, Orders, Order, Products, ProductForm, Categories, Users, Login
```

Quy ước:
- `shared/` không bao giờ import từ `shop/` hay `backoffice/`.
- Mỗi ứng dụng chỉ gọi backend qua `api.js` của chính nó.
- Thứ dùng ở hai trang trong cùng một ứng dụng đặt vào `components/` của ứng dụng đó; thứ dùng ở cả hai
  ứng dụng đặt vào `shared/`.

`shared/utils/constants.js` phản chiếu máy trạng thái đơn hàng và danh mục sản phẩm của backend; khi
backend thay đổi các phần này thì phải cập nhật theo. Trạng thái vận đơn chỉ để hiển thị, vì vận đơn
đi theo trạng thái đơn hàng.
