**1\. HỆ THỐNG ĐIỂM UY TÍN & ĐÁNH GIÁ SAO**

Hệ thống của bạn có 2 thực thể riêng biệt: **Người mua (Buyer Reputation)** và **Cửa hàng (Shop Rating)**.

**A. Điểm Uy Tín Người Mua (Buyer Reputation Score)**

* **Khoảng điểm:** $0≤S≤100$ (Mặc định khi đăng ký tài khoản mới: $S=100$).

* **Công thức cập nhật điểm sau mỗi giao dịch:**

$${S}_{mới}=\left({100,\left({0,{S}_{hiện tại}+\Delta S}\right)\ }\right){\ }$$

Trong đó, biến động điểm $\Delta S$ quy định như sau:

* **Mua hàng & Thanh toán thành công:** $\Delta S=+2$ điểm (cộng dồn nhưng không vượt quá 100).

* **Hoàn tất đơn hàng đúng hạn, không khiếu nại:** $\Delta S=+1$ điểm.

* **Hủy đơn sau khi đã chốt/Đấu giá thắng nhưng không trả tiền:** $\Delta S=-15$ điểm.

* **Bom hàng (Giao hàng thất bại do lỗi người mua):** $\Delta S=-30$ điểm.

**Cơ chế khóa tài khoản (Penalization):**

* $S≥80$: Tài khoản uy tín cao (Được tham gia đấu giá lớn, thanh toán COD).

* $50≤S<80$: Uy tín trung bình (Cần cọc trước 20% khi đặt hàng/đấu giá).

* $S<50$: Hạn chế tính năng (Bắt buộc thanh toán online 100% trước khi giao hàng).

* $S<20$: không được tham gia đấu giá.

**B. Điểm Đánh Giá Sao Của Shop (Shop Rating Score)**

Mức độ uy tín của Shop hiển thị dạng Số sao từ **1.0 đến 5.0 sao**, tự động tính từ tổng các đánh giá sản phẩm của người mua.

**1\. Công thức trung bình cộng có trọng số (Weighted Average Rating)**

Để tránh trường hợp Shop có ít đánh giá nhưng toàn 5 sao đứng trên Shop có hàng nghìn đánh giá 4.8 sao, ta áp dụng công thức:

$$\overline{R}=\frac{\sum\limits_{i=1}^{5}\left({i×{n}_{i}}\right)}{N}$$

* ${n}_{i}$: Số lượng đánh giá đạt $i$ sao ($i∈\left\{{1,2,3,4,5}\right\}$).

* $N=\sum\limits_{i=1}^{5}{n}_{i}$: Tổng số lượt đánh giá.

**2\. Công thức quy đổi ra Mức Uy Tín Hệ Thống (Shop Trust Level)**

Dựa vào $\overline{R}$ và số lượng đơn hàng $N$, hệ thống phân loại Shop:

* **Shop Uy Tín Yếu (Cảnh báo):** $\overline{R}<3.5$ hoặc có tỷ lệ hủy đơn $>10%$.

* **Shop Đạt Chuẩn:** $3.5≤\overline{R}<4.5$.

* **Shop Yêu Thích / Verified Shop:** $\overline{R}≥4.5$ và $N≥100$ đánh giá.

**2\. CÔNG THỨC TÍNH PHÍ VẬN CHUYỂN & HẢI QUAN**

Phí vận chuyển được chia làm 2 trường hợp dựa trên **Số điện thoại (SĐT)** đăng ký tài khoản của Người mua.

**A. Phân loại luồng dựa vào SĐT**

TypeScript

function checkShippingType(phoneNumber: string): 'DOMESTIC' | 'INTERNATIONAL' {

  // Nếu SĐT bắt đầu bằng \+84 hoặc 0 (Định dạng VN) \-\> Nội địa

  if (phoneNumber.startsWith('+84') || phoneNumber.startsWith('0')) {

    return 'DOMESTIC';

  }

  // Mọi đầu số quốc tế khác (+1, \+81, \+82...) \-\> Ngoại quốc (Cần Hải quan)

  return 'INTERNATIONAL';

}

**B. Các Thông Số Đầu Vào Cần Thiết**

1. **Trọng lượng tính phí (Chargeable Weight \- $W$ kg):**

$$W=\left({{W}_{thực},\frac{D×R×C}{5000}}\right){\ }$$

*(Với $D,R,C$ là Dài, Rộng, Cao tính bằng cm).*

2. **Khoảng cách vận chuyển ($K$ km):** Tính khoảng cách địa lý giữa Kho của Shop và Địa chỉ nhận hàng của Người mua.

**C. Công Thức 1: Phí Ship Nội Quốc (Domestic Shipping)**

Áp dụng cho SĐT đầu số **\+84** (Việt Nam).

$$Phí Ship Nội Quốc={P}_{nền}+\left({⌈W-{W}_{chuẩn}⌉\times {P}_{vượt cân}}\right)+\left({K×{P}_{km}}\right)$$

**Trong đó (Ví dụ tham số hệ thống):**

* ${P}_{nền}$: Phí cơ sở \= **15.000 VNĐ** (đã bao gồm ${W}_{chuẩn}=1$ kg đầu tiên).

* ${P}_{vượt cân}$: Phí cho mỗi kg tiếp theo \= **5.000 VNĐ/kg**.

* ${P}_{km}$: Đơn giá khoảng cách \= **500 VNĐ/km** (nếu $K>10$ km).

**D. Công Thức 2: Phí Ship Ngoại Quốc (International Shipping)**

Áp dụng cho SĐT không thuộc đầu số **\+84**. Phí ship này bằng **Phí Ship Gốc Quốc Tế \+ Thuế Hải Quan**.

$$Tổng Phí Ngoại Quốc=Phí Ship Quốc Tế+Thuế Hải Quan$$

**1\. Phí Ship Quốc Tế (Trọng lượng & Khoảng cách quốc tế)**

**$$Phí Ship Quốc Tế={P}_{nền\_INT}+\left({W×{P}_{kg\_INT}}\right)+\left({K×{P}_{km\_INT}}\right)$$**

* ${P}_{nền\_INT}$: Phí xử lý đơn quốc tế \= **200.000 VNĐ** (\~$8$).

* ${P}_{kg\_INT}$: Đơn giá cước bay/tàu \= **80.000 VNĐ/kg**.

* ${P}_{km\_INT}$: Đơn giá khoảng cách quốc tế \= **2.000 VNĐ/100 km**.

**2\. Phí Thuế Hải Quan (Customs Duties & Tax)**

Thuế hải quan được tính dựa trên **Giá trị hàng hóa ($V$)** và **Tỷ lệ thuế quy định theo quốc gia (${T}_{thuế}$)**:

$$Thuế Hải Quan=\left({V×{T}_{nhập khẩu}}\right)+\left({\left({V+Thuế nhập khẩu}\right)\times {T}_{VAT}}\right)+{P}_{thủ tục}$$

* **Giải thích đơn giản cho Code Backend:**

Để đơn giản hóa thuật toán, hệ thống tính Thuế hải quan tổng hợp theo công thức tỷ lệ cố định dựa trên giá trị hàng:

$$Thuế Hải Quan=\left({V×10%}\right)+{P}_{thủ tục hải quan (50.000 VNĐ)}$$

