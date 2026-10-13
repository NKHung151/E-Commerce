#!/usr/bin/env python3
"""
Generate the demo catalogue that matches the AI service's behaviour log.

ai-service/data/user_behavior.csv records what customers 1..550 did with products
1..300, so the shop must contain exactly those products (same ids) for the
recommendations, the graph and the chatbot to make sense. This script turns the
catalogue below plus that log into seed files that the Django data migrations load:

  product-service/product_app/seed/products.json      300 products + category details
  comment-rate-service/comment_app/seed/reviews.json   reviews written by real buyers

Derived from the log: product `views` (number of view events) and reviews (a share
of the purchases, dated a few days after the purchase). `rating` is computed with the
same Bayesian average comment-rate-service uses, so it stays consistent when new
reviews arrive. Re-run after editing the catalogue:

  python infrastructure/seed/generate_seed_data.py
"""
import csv
import json
import random
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BEHAVIOR_CSV = ROOT / "ai-service" / "data" / "user_behavior.csv"
PRODUCTS_OUT = ROOT / "product-service" / "product_app" / "seed" / "products.json"
REVIEWS_OUT = ROOT / "comment-rate-service" / "comment_app" / "seed" / "reviews.json"

# Category ids follow catalog-service's seed migration (0002_seed_categories).
# Products are grouped by id range: 1-30 -> category 1, 31-60 -> category 2, ...
CATEGORIES = [
    # (id, catalog name, sku prefix, detail relation, field 1, field 2)
    (1, "Books", "BOK", "book", "author", "publisher"),
    (2, "Electronics", "ELE", "electronics", "brand", "warranty"),
    (3, "Fashion", "FAS", "fashion", "size", "color"),
    (4, "Home & Living", "HOM", "home_living", "material", "dimensions"),
    (5, "Sports & Outdoors", "SPO", "sports_outdoors", "sport_type", "weight"),
    (6, "Beauty & Health", "BEA", "beauty_health", "ingredient", "volume"),
    (7, "Toys & Games", "TOY", "toys_games", "age_range", "players"),
    (8, "Automotive", "AUT", "automotive", "vehicle_type", "compatibility"),
    (9, "Food & Grocery", "FOO", "food_grocery", "expiry_days", "weight"),
    (10, "Office Supplies", "OFF", "office_supplies", "pack_size", "material"),
]
INT_FIELDS = {"warranty", "expiry_days", "pack_size"}

# id | name | price (VND) | detail field 1 | detail field 2
CATALOGUE = """
1|Clean Code: A Handbook of Agile Software Craftsmanship|450000|Robert C. Martin|Prentice Hall
2|The Pragmatic Programmer 20th Anniversary Edition|420000|David Thomas, Andrew Hunt|Addison-Wesley
3|Design Patterns: Elements of Reusable Object-Oriented Software|380000|Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides|Addison-Wesley
4|Atomic Habits - Thói Quen Tí Hon Hiệu Quả Bất Ngờ|189000|James Clear|NXB Thế Giới
5|Deep Learning với Python|520000|François Chollet|NXB Bách Khoa Hà Nội
6|Đắc Nhân Tâm - Dale Carnegie|120000|Dale Carnegie|NXB Tổng hợp TP.HCM
7|Sapiens: Lược Sử Loài Người|245000|Yuval Noah Harari|NXB Tri Thức
8|The Psychology of Money - Tâm Lý Học Tiền Bạc|189000|Morgan Housel|NXB Dân Trí
9|Thinking Fast and Slow - Tư Duy Nhanh Và Chậm|245000|Daniel Kahneman|NXB Thế Giới
10|The Lean Startup - Khởi Nghiệp Tinh Gọn|210000|Eric Ries|NXB Lao Động
11|Zero to One - Từ 0 Đến 1|199000|Peter Thiel, Blake Masters|NXB Trẻ
12|Python Crash Course 3rd Edition|490000|Eric Matthes|No Starch Press
13|Introduction to Algorithms CLRS 4th Edition|890000|Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein|MIT Press
14|JavaScript: The Good Parts|350000|Douglas Crockford|O'Reilly Media
15|System Design Interview Volume 1|480000|Alex Xu|ByteByteGo
16|System Design Interview Volume 2|480000|Alex Xu, Sahn Lam|ByteByteGo
17|Refactoring: Improving the Design of Existing Code|420000|Martin Fowler|Addison-Wesley
18|The Art of War - Binh Pháp Tôn Tử|89000|Tôn Vũ|NXB Văn Học
19|Dune - Xứ Cát Tập 1|195000|Frank Herbert|NXB Hội Nhà Văn
20|The Alchemist - Nhà Giả Kim|125000|Paulo Coelho|NXB Hội Nhà Văn
21|Rich Dad Poor Dad - Cha Giàu Cha Nghèo|175000|Robert T. Kiyosaki|NXB Trẻ
22|Bố Già - The Godfather|185000|Mario Puzo|NXB Văn Học
23|Hoàng Tử Bé - Le Petit Prince|85000|Antoine de Saint-Exupéry|NXB Kim Đồng
24|Tôi Thấy Hoa Vàng Trên Cỏ Xanh|135000|Nguyễn Nhật Ánh|NXB Trẻ
25|Machine Learning Yearning|300000|Andrew Ng|deeplearning.ai
26|Kubernetes in Action 2nd Edition|620000|Marko Lukša|Manning Publications
27|Docker Deep Dive|310000|Nigel Poulton|Leanpub
28|The Clean Coder|380000|Robert C. Martin|Prentice Hall
29|Soft Skills: The Software Developer's Life Manual|390000|John Sonmez|Manning Publications
30|Head First Design Patterns 2nd Edition|520000|Eric Freeman, Elisabeth Robson|O'Reilly Media
31|Laptop Gaming ASUS ROG Strix G15 AMD Ryzen 7 6800H|22990000|ASUS|24
32|Laptop Dell XPS 13 Plus Intel Core i7 16GB RAM 512GB|28500000|Dell|12
33|Laptop Apple MacBook Pro M3 14 inch 512GB SSD|49990000|Apple|12
34|Laptop Lenovo Legion 5 Pro RTX 4070 16GB RAM|32990000|Lenovo|24
35|Laptop HP Spectre x360 14 inch Intel i7 OLED|29990000|HP|12
36|Laptop Acer Nitro 5 AN515 RTX 3060 144Hz|18990000|Acer|12
37|Laptop MSI Raider GE78 HX Intel i9 RTX 4080|65990000|MSI|24
38|Laptop LG Gram 17 Ultra-Light Intel i7 1.35kg|35990000|LG|12
39|Điện thoại iPhone 15 Pro Max 256GB Titan Tự Nhiên|34990000|Apple|12
40|Điện thoại iPhone 15 Pro 128GB Titan Đen|29990000|Apple|12
41|Điện thoại Samsung Galaxy S24 Ultra 512GB Titanium|35990000|Samsung|12
42|Điện thoại Samsung Galaxy S24+ 256GB|24990000|Samsung|12
43|Điện thoại OPPO Find X7 Ultra 256GB|18990000|OPPO|12
44|Điện thoại Xiaomi 14 Ultra 512GB|22990000|Xiaomi|18
45|Điện thoại Google Pixel 8 Pro 256GB|21990000|Google|12
46|Tai nghe Sony WH-1000XM5 Chống Ồn ANC Không Dây|8990000|Sony|12
47|Tai nghe Apple AirPods Pro 2nd Gen USB-C MagSafe|6490000|Apple|12
48|Tai nghe Bose QuietComfort Ultra Headphones|9990000|Bose|12
49|Chuột gaming Logitech G502 X Plus Wireless HERO|2890000|Logitech|24
50|Chuột Razer DeathAdder V3 Pro Ergonomic|2490000|Razer|24
51|Bàn phím cơ Keychron K2 Pro Wireless RGB Aluminum|2490000|Keychron|12
52|Bàn phím cơ HHKB Professional Hybrid Type-S|6590000|PFU|12
53|Màn hình LG 27UP850N-W 27 inch 4K IPS USB-C|12990000|LG|24
54|Màn hình Samsung Odyssey G7 32 inch QHD 240Hz|13990000|Samsung|24
55|SSD Samsung 990 Pro NVMe M.2 1TB PCIe 4.0|2190000|Samsung|60
56|SSD WD Black SN850X 2TB NVMe PCIe 4.0|4290000|Western Digital|60
57|RAM Corsair Vengeance 32GB DDR5 5600MHz Kit|3290000|Corsair|120
58|Webcam Logitech C920 HD Pro 1080p 30fps|1590000|Logitech|24
59|Card đồ họa NVIDIA GeForce RTX 4070 Super 12GB|18990000|NVIDIA|36
60|Loa bluetooth JBL Charge 5 IP67 20h Pin|3490000|JBL|12
61|Áo thun nam Nike Dri-FIT Short Sleeve Training Top|450000|L|Đen
62|Áo polo nam Lacoste Classic Fit L.12.12 Cotton|1890000|M|Trắng
63|Áo sơ mi nam Calvin Klein Slim Fit Oxford Stretch|990000|L|Xanh nhạt
64|Áo khoác nam The North Face Thermoball Eco Jacket|4290000|XL|Đen
65|Áo hoodie nam Champion Reverse Weave Pullover|890000|L|Xám
66|Quần jean nam Levi's 511 Slim Fit Stretch|890000|32|Xanh đậm
67|Quần chino nam H&M Slim Fit Cotton Blend|490000|31|Be
68|Quần short nam Adidas Essentials 3-Stripes|390000|M|Đen
69|Giày thể thao nam Adidas Ultraboost 22 Running|3290000|42|Đen
70|Giày thể thao nam Nike Air Max 270 React|2890000|42|Trắng
71|Giày da nam Clarks Desert Boot Leather|2490000|41|Nâu cát
72|Túi đeo chéo nam Samsonite Mobile Solution V2|1290000|Free|Đen
73|Áo dài nữ lụa cao cấp họa tiết hoa Đà Lạt|1890000|M|Đỏ đô
74|Đầm maxi nữ Zara Linen Blend cổ vuông|1190000|S|Trắng kem
75|Váy midi nữ Mango Floral Print Chiffon|1290000|S|Hoa nhí
76|Quần tây nữ H&M Wide-Leg High Waist Linen|690000|M|Be
77|Áo len nữ Uniqlo Premium Lambswool Crew Neck|990000|M|Hồng phấn
78|Giày cao gót nữ Charles & Keith Strappy Stiletto|1490000|37|Đen
79|Giày sneaker nữ New Balance 574 Classic|1890000|37|Xám
80|Túi xách nữ Coach Tabby 26 Leather Shoulder|5990000|Free|Nâu
81|Túi tote nữ Longchamp Le Pliage Original M|2490000|M|Xanh navy
82|Đồng hồ nữ Michael Kors Darci Pave Rose Gold|4290000|Free|Vàng hồng
83|Đồng hồ nam Seiko 5 Sports Automatic 42mm|5290000|Free|Bạc
84|Kính mắt nam Ray-Ban Aviator Classic RB3025|3490000|Free|Gọng vàng
85|Mũ bucket Kangol Wool Casual|890000|M|Đen
86|Khăn quàng cổ Burberry Classic Check Wool|4990000|Free|Kẻ caro be
87|Thắt lưng da nam Montblanc Reversible Leather|2890000|Free|Đen/Nâu
88|Vớ nam Stance Uncommon Solids Crew 3-Pack|390000|Free|Nhiều màu
89|Quần legging nữ Lululemon Align HR 25|2890000|S|Đen
90|Áo sports bra nữ Nike Swoosh Medium Support|890000|M|Đen
91|Nồi cơm điện Panasonic SR-LD05 0.54L Compact|890000|Nhựa PP, lòng nồi chống dính|25 x 20 x 19 cm
92|Nồi chiên không dầu Philips Essential XL 6.2L|2490000|Nhựa chịu nhiệt, khay chống dính|38 x 32 x 31 cm
93|Máy lọc không khí Xiaomi Smart Air Purifier 4|3490000|Nhựa ABS, màng lọc HEPA|27 x 27 x 73 cm
94|Robot hút bụi Roomba j7+ tự đổ rác|12990000|Nhựa ABS|34 x 34 x 8.7 cm
95|Máy giặt LG FV1412H3BA Inverter 12kg|12990000|Thép không gỉ, nhựa|60 x 56 x 85 cm
96|Tủ lạnh Samsung Bespoke 1 cửa 382L RF38A4010WW|12500000|Thép sơn tĩnh điện|59.5 x 67.5 x 185 cm
97|Lò vi sóng Panasonic NN-ST342MYUE 25L Grill|3290000|Thép mạ, khoang tráng men|48.5 x 39.6 x 28.7 cm
98|Ấm đun nước Philips HD9352 1.7L 2200W|890000|Thép không gỉ 304|22 x 15 x 25 cm
99|Đèn ngủ thông minh Philips Hue Go v2 Bluetooth|1890000|Nhựa PC, silicone|Ø15 x 15 cm
100|Bóng đèn thông minh Xiaomi Mi LED Smart Bulb E27|289000|Nhựa PC, LED|Ø6 x 11 cm
101|Ghế làm việc Herman Miller Aeron Size B|28990000|Khung nhôm, lưới Pellicle|69 x 65 x 104 cm
102|Ghế gaming DXRacer Formula F08 PU Leather|4990000|Da PU, khung thép|70 x 70 x 130 cm
103|Bàn làm việc nâng hạ điện Flexispot E7 160x80|11990000|Gỗ MDF, khung thép|160 x 80 x 58-123 cm
104|Kệ sách gỗ thông 5 tầng Jysk Nordby|2890000|Gỗ thông tự nhiên|80 x 30 x 180 cm
105|Gương soi toàn thân khung gỗ treo tường|890000|Gỗ cao su, kính tráng bạc|50 x 160 cm
106|Chăn lông vũ Everon Premium 200x220cm|2490000|Vỏ cotton, ruột lông vũ|200 x 220 cm
107|Gối ngủ Tempur Original Neck Pillow|2890000|Foam Tempur|50 x 31 x 10 cm
108|Máy lọc nước RO Kangaroo Omega KG10A3 10 lõi|6990000|Thép sơn tĩnh điện, nhựa ABS|40 x 30 x 90 cm
109|Bếp từ đôi Sunhouse SHB9116MT|3490000|Mặt kính ceramic|73 x 43 x 6.5 cm
110|Nồi áp suất điện Instant Pot Duo 7-in-1 8L|3290000|Thép không gỉ 304|34 x 31 x 32 cm
111|Bộ dao bếp Zwilling Four Star 5 món|3990000|Thép không gỉ Friodur|Hộp 40 x 20 x 8 cm
112|Chảo chống dính Tefal Expertise 28cm|890000|Nhôm phủ Titanium|Ø28 cm
113|Máy xay sinh tố Vitamix E310 Explorian 2.0HP|9990000|Nhựa Tritan, lưỡi thép|20 x 22 x 44 cm
114|Máy pha cà phê DeLonghi Magnifica Evo ECAM290.22|11990000|Nhựa ABS, inox|24 x 44 x 36 cm
115|Tranh treo tường canvas phong cảnh biển 80x60|890000|Vải canvas, khung gỗ thông|80 x 60 cm
116|Bộ chăn ga gối Everon Luxury 1m8x2m Cotton|3490000|Cotton 100%|180 x 200 cm
117|Thảm trải sàn phòng khách Shaggy 160x230cm|2890000|Sợi polyester|160 x 230 cm
118|Máy sấy quần áo Samsung DV90T6240LH Inverter 9kg|11990000|Thép sơn, lồng inox|60 x 65 x 85 cm
119|Bộ sofa góc L da công nghệ 4 chỗ ngồi|15990000|Da công nghệ, khung gỗ dầu|280 x 180 x 85 cm
120|Đồng hồ treo tường Seiko QXA771S Silent Sweep|890000|Nhựa ABS, mặt kính|Ø31 cm
121|Xe đạp địa hình Giant Talon 3 27.5 inch 2024|10990000|Xe đạp địa hình|13.5 kg
122|Xe đạp đua Trek Domane AL 2 700c Shimano 16s|14990000|Xe đạp đường trường|10.5 kg
123|Vợt cầu lông Yonex Astrox 88D Pro 4U|3890000|Cầu lông|83 g
124|Vợt tennis Wilson Pro Staff 97 v14 315g|4290000|Tennis|315 g
125|Giày cầu lông Yonex Power Cushion 65 Z3|2290000|Cầu lông|340 g
126|Thảm yoga TPE cao su 6mm chống trượt 183x61cm|490000|Yoga|0.9 kg
127|Dây kháng lực tập gym set 5 dây latex|390000|Gym|0.5 kg
128|Tạ tay điều chỉnh Bowflex SelectTech 552 52lb|8990000|Gym|2 x 23.8 kg
129|Xe đạp tập trong nhà Schwinn IC4 Bluetooth|12990000|Đạp xe trong nhà|48 kg
130|Máy chạy bộ NordicTrack T Series 6.5S|18990000|Chạy bộ|98 kg
131|Kính bơi Speedo Fastskin Elite Mirror|1290000|Bơi lội|50 g
132|Balo leo núi Osprey Atmos AG 65L|5990000|Leo núi|2.1 kg
133|Lều cắm trại 2-4 người Coleman Sundome 3|2990000|Cắm trại|4.5 kg
134|Túi ngủ Naturehike CW400 Goose Down -7°C|2490000|Cắm trại|1.4 kg
135|Đèn pin đầu Petzl Actik Core 450 lm|1490000|Leo núi|75 g
136|Gậy trekking Black Diamond Trail Ergo Cork|1290000|Trekking|0.5 kg
137|Găng tay boxing RDX T9 Aura 12oz|890000|Boxing|0.68 kg
138|Dây nhảy Crossrope Get Lean Set|2290000|Gym|0.6 kg
139|Bóng đá Adidas Al Rihla Pro FIFA Quality|1290000|Bóng đá|420 g
140|Giày chạy bộ Nike Zoom Vaporfly 3 Women|4890000|Chạy bộ|190 g
141|Giày trail running Salomon Speedcross 6|3490000|Chạy trail|300 g
142|Mũ bảo hiểm xe đạp Giro Cinder Mips|2290000|Xe đạp|290 g
143|Kính xe đạp Oakley Jawbreaker Prizm Road|4990000|Xe đạp|31 g
144|Quần bơi thi đấu Speedo Fastskin LZR Valor Jammer|2890000|Bơi lội|150 g
145|Máy đo nhịp tim Garmin HRM-Pro Plus Chest Strap|2490000|Chạy bộ|59 g
146|Đồng hồ thể thao Garmin Forerunner 955 Solar|12990000|Chạy bộ|52 g
147|Bình nước thể thao Hydro Flask 32oz Wide Mouth|990000|Đa môn|0.43 kg
148|Miếng dán đầu gối KT Tape Pro 20 dải|390000|Đa môn|60 g
149|Kem bôi cơ Voltaren Emulgel Forte 150g|380000|Phục hồi|150 g
150|Thảm yoga Manduka PRO 6mm Black|3990000|Yoga|3.4 kg
151|Kem chống nắng Anessa Perfect UV SPF50+ PA++++ 60ml|685000|Zinc Oxide, Hyaluronic Acid|60 ml
152|Serum Vitamin C La Roche-Posay Pure 10% 30ml|1150000|Vitamin C 10%, Salicylic Acid|30 ml
153|Kem dưỡng ẩm Cetaphil Moisturizing Cream 250g|390000|Glycerin, Vitamin E|250 g
154|Máy rửa mặt Foreo Luna 3 Silicone Sonic|4990000|Silicone y tế|1 máy
155|Bàn chải điện Oral-B iO Series 9|7990000|Đầu chải lông mềm|1 máy, 3 đầu chải
156|Nước tẩy trang Bioderma Sensibio H2O 500ml|459000|Micellar, chiết xuất dưa leo|500 ml
157|Toner AHA/BHA Paula's Choice Skin Perfecting 8%|790000|Glycolic Acid 8%|100 ml
158|Retinol Serum The Ordinary Granactive Retinoid 2%|349000|Granactive Retinoid 2%|30 ml
159|Mặt nạ đất sét Innisfree Super Volcanic Pore Clay|290000|Đất sét núi lửa Jeju|100 ml
160|Nước hoa Chanel Coco Mademoiselle EDP 50ml|3990000|Hoắc hương, hoa hồng, cam|50 ml
161|Son môi MAC Matte Lipstick Ruby Woo|650000|Sáp, chất tạo màu|3 g
162|Phấn phủ Fenty Beauty Pro Filt'r Soft Matte|990000|Bột khoáng|10 g
163|Kem nền Estee Lauder Double Wear Stay-In-Place|1350000|SPF 10, Hyaluronic Acid|30 ml
164|Mascara L'Oreal Lash Paradise Voluminous|279000|Dầu thầu dầu, chiết xuất hoa hồng|6.4 ml
165|Dầu gội Kérastase Bain Satin 1 Nutritive 250ml|850000|Glucose, Glycerin|250 ml
166|Dầu xả Pantene Pro-V Repair & Protect 480ml|155000|Pro-Vitamin B5|480 ml
167|Kem dưỡng mắt Kiehl's Creamy Eye Treatment Avocado|950000|Dầu bơ, bơ hạt mỡ|14 ml
168|Tinh chất dưỡng da SK-II Facial Treatment Essence 160ml|4290000|Pitera 90%|160 ml
169|Kem chống lão hóa Olay Regenerist Microsculpting|459000|Niacinamide, Peptide|50 g
170|Mặt nạ ngủ Laneige Water Sleeping Mask|650000|Nước khoáng ion hoá|70 ml
171|Mặt nạ ngủ môi Laneige Lip Sleeping Mask|395000|Chiết xuất quả mọng, Vitamin C|20 g
172|Sữa rửa mặt La Roche-Posay Toleriane Hydrating|420000|Ceramide-3, Niacinamide|400 ml
173|Máy massage mặt NuFACE Trinity Facial Toning|8990000|Vi dòng điện|1 máy
174|Collagen nước Shiseido The Collagen EX 50ml x10|1290000|Collagen peptide 1000 mg|10 x 50 ml
175|Vitamin tổng hợp Blackmores Executive B Stress Formula|690000|Vitamin nhóm B, Magie|62 viên
176|Omega-3 Fish Oil Nature Made 1200mg 100 viên|520000|Dầu cá EPA/DHA|100 viên
177|Probiotic Culturelle Digestive Health 30 viên|690000|Lactobacillus rhamnosus GG|30 viên
178|Kem bôi trị mụn Paula's Choice BHA 2% Gel|850000|Salicylic Acid 2%|100 ml
179|Xịt khoáng Avène Thermal Spring Water 150ml|335000|Nước khoáng Avène|150 ml
180|Bộ chăm sóc da Neutrogena Hydro Boost 3 món|890000|Hyaluronic Acid|3 món
181|LEGO Technic Land Rover Defender 42110 2573 mảnh|5990000|11+ tuổi|1
182|LEGO City Space Base & Rocket Launchpad 60434|2490000|6+ tuổi|1-2
183|PlayStation 5 Console Slim 1TB Digital Edition|11490000|12+ tuổi|1-4
184|Xbox Series X 1TB Gaming Console|13990000|12+ tuổi|1-4
185|Nintendo Switch OLED Model Neon Blue/Red|7990000|6+ tuổi|1-8
186|Board game Ticket to Ride Europe phiên bản VN|1490000|8+ tuổi|2-5
187|Board game Catan Settlers Base Game 5th Edition|1190000|10+ tuổi|3-4
188|Board game Pandemic Legacy Season 1 Blue Edition|1890000|13+ tuổi|2-4
189|Board game Wingspan with European Expansion|1690000|10+ tuổi|1-5
190|Rubik's Cube 3x3 Gan 356 XS Magnetic Speed|990000|8+ tuổi|1
191|Bộ xếp hình LEGO DUPLO Town Xe cứu hỏa 10969|790000|2+ tuổi|1-2
192|Drone DJI Mini 4 Pro 4K Camera GPS|21990000|14+ tuổi|1
193|Xe điều khiển từ xa Traxxas Rustler 4x4 VXL|12990000|14+ tuổi|1
194|Búp bê Barbie Dreamhouse Adventures 3-Story|4990000|3+ tuổi|1-4
195|Xe LEGO Technic Bugatti Chiron 42083 3599 mảnh|11990000|16+ tuổi|1
196|Game thẻ bài Pokémon TCG Scarlet & Violet Elite Trainer|1290000|6+ tuổi|2
197|Đàn piano điện Casio CT-S300 61 phím cho trẻ|3290000|6+ tuổi|1
198|Bộ vẽ màu Copic Ciao 36 màu cho họa sĩ|3490000|12+ tuổi|1
199|Bộ cờ vua gỗ quốc tế nam châm 38cm|590000|6+ tuổi|2
200|Game PS5 Elden Ring Standard Edition|990000|16+ tuổi|1-4
201|Game Nintendo FIFA 24 Legacy Edition Switch|890000|3+ tuổi|1-4
202|Đồ chơi khoa học National Geographic Mega Science Kit|890000|8+ tuổi|1-2
203|Bộ đường đua Hot Wheels City Ultimate Garage|1890000|5+ tuổi|1-2
204|Súng nước NERF HyperFire Motorized Blaster|1290000|8+ tuổi|1-2
205|Đồ chơi nhà bếp mini Kitchen Play Set 43 món|459000|3+ tuổi|1-3
206|Xe đạp cân bằng Strider 12 Sport cho bé 18th-5 tuổi|3290000|18 tháng - 5 tuổi|1
207|Lắp ráp mô hình Gundam RG 1/144 RX-78-2|790000|15+ tuổi|1
208|Máy ảnh đồ chơi cho trẻ em VTech KidiZoom 8MP|1490000|3+ tuổi|1
209|Bộ thí nghiệm hóa học Thames & Kosmos CHEM C1000|2490000|10+ tuổi|1-2
210|Sách tô màu người lớn Johanna Basford Secret Garden|290000|12+ tuổi|1
211|Camera hành trình 70mai Pro Plus+ A500S 2K GPS|2490000|Ô tô|Mọi dòng xe
212|Camera hành trình Vietmap C65 4K GPS WiFi|3990000|Ô tô|Mọi dòng xe
213|Camera lùi xe hơi VIETMAP BC50 Full HD|1490000|Ô tô|Xe có màn hình hiển thị
214|Lốp xe ô tô Michelin Primacy 4 205/55R16|2290000|Ô tô|Toyota Corolla Altis, Mazda 3, Kia K3
215|Lốp xe máy Michelin Pilot Street 2 100/80-17|790000|Xe máy|Yamaha Exciter, Honda Winner X
216|Lốp ô tô Bridgestone Turanza T005A 215/55R17|2690000|Ô tô|Toyota Camry, Honda Accord
217|Nhớt xe máy Motul 3100 4T 10W-40 1L|159000|Xe máy|Xe số và xe côn tay 4 thì
218|Nhớt ô tô Castrol EDGE 5W-30 Full Synthetic 4L|1150000|Ô tô|Động cơ xăng và diesel
219|Máy bơm lốp xe Xiaomi Mijia Electric Air Pump 1S|990000|Ô tô, xe máy, xe đạp|Van Schrader và Presta
220|Bình ắc quy GS Yuasa 45Ah MF din45 cho Toyota Vios|1690000|Ô tô|Toyota Vios, Toyota Yaris
221|Loa xe hơi Pioneer TS-A1687S 6.5 inch 350W|1890000|Ô tô|Vị trí loa cửa 6.5 inch
222|DVD Android xe hơi Oled C2 New 2024 9 inch|5490000|Ô tô|Mặt dưỡng 9 inch theo xe
223|Màn hình Android ô tô Carplay 10 inch 4G 4+64GB|6990000|Ô tô|Mặt dưỡng 10 inch theo xe
224|Ghế ngồi ô tô cho bé Chicco NextFit Zip 2.0|8990000|Ô tô|Xe có chốt ISOFIX hoặc dây đai 3 điểm
225|Thảm lót sàn ô tô 5D chống thấm Toyota Camry 2023|2190000|Ô tô|Toyota Camry 2022-2024
226|Nước rửa kính xe ô tô Rain-X Original 473ml|249000|Ô tô|Mọi dòng xe
227|Cảm biến áp suất lốp TPMS Xiaomi 70mai 4 bánh|1590000|Ô tô|Mâm 13-22 inch
228|Bóng đèn ô tô Osram Night Breaker H4 200%|590000|Ô tô|Xe dùng bóng H4
229|Máy chẩn đoán lỗi xe OBD2 Bluetooth ANCEL AD310|790000|Ô tô|Xe có cổng OBD2
230|Bộ vệ sinh xe hơi Meguiar's Ultimate Wash & Wax Kit|890000|Ô tô|Mọi loại sơn xe
231|Keo dán kính chắn gió 3M Auto Windshield Sealant|189000|Ô tô|Kính chắn gió mọi dòng xe
232|Ghế ngồi trẻ em 2 trong 1 Aprica Fladea Grow|6490000|Ô tô|Xe có chốt ISOFIX hoặc dây đai 3 điểm
233|Bơm hơi ô tô Ryobi PCL525B One+ 18V Cordless|1590000|Ô tô, xe máy|Van Schrader
234|Còi xe hơi Wolo 519 Bad Boy Air Horn|1290000|Ô tô|Hệ thống điện 12V
235|Giá đỡ điện thoại xe hơi Belkin MagSafe|990000|Ô tô|iPhone 12 trở lên
236|Máy hút bụi xe hơi Dyson V7 Car+Boat|7490000|Ô tô|Nội thất mọi dòng xe
237|Tẩu sạc nhanh USB-C xe hơi Anker PowerDrive Speed+|490000|Ô tô|Tẩu sạc 12V/24V
238|Nệm hơi ngủ trong xe SUV Inflatable Mattress|890000|Ô tô|SUV 7 chỗ, xe bán tải
239|Bình xịt chống muỗi xe hơi Raid Max 300ml|85000|Ô tô|Nội thất xe
240|Bộ bình phun bọt tuyết Karcher Foam Cannon K4|1290000|Ô tô|Máy rửa xe Karcher K2-K7
241|Cà phê rang xay Trung Nguyên Legend Robusta 500g|189000|365|500 g
242|Cà phê Arabica hạt nguyên chất Highlands Coffee 200g|219000|365|200 g
243|Yến mạch Quaker Original không đường 4.52kg|390000|540|4.52 kg
244|Gạo ST25 Ông Cua túi 5kg Thơm Lài Hạt Dài|185000|365|5 kg
245|Mì Hảo Hảo tôm chua cay thùng 30 gói|145000|180|30 x 75 g
246|Bánh mì sandwich Harvest Gold toàn phần 600g|65000|7|600 g
247|Sữa bột Ensure Gold hương vani lon 850g|945000|540|850 g
248|Sữa tươi Vinamilk 100% Không đường thùng 48 hộp 180ml|385000|180|48 x 180 ml
249|Trà xanh matcha Nhật Bản Ito En Oi Ocha 100g|890000|365|100 g
250|Nước tương Maggi Phú Quốc chai 300ml|29000|540|300 ml
251|Dầu olive Bertolli Extra Virgin 750ml|289000|540|750 ml
252|Mật ong rừng nguyên chất Việt Nam 500g|195000|730|500 g
253|Hạt chia Salba Chia Premium White 1kg|390000|540|1 kg
254|Hạnh nhân rang muối California Kirkland 1.13kg|490000|365|1.13 kg
255|Phô mai Laughing Cow tam giác 140g 8 miếng|55000|180|140 g
256|Cá hồi phi lê tươi Na Uy (500g - nhập khẩu)|490000|3|500 g
257|Thịt bò Wagyu A5 Nhật Bản nhập khẩu 200g|890000|5|200 g
258|Tôm thẻ tươi sạch 500g không đầu (loại 30-40 con)|185000|3|500 g
259|Rau củ sạch mix 1kg (cà rốt, bắp cải, súp lơ)|89000|5|1 kg
260|Trái cây nhập khẩu: Táo Envy New Zealand 8 quả|189000|21|8 quả
261|Chocolate đen Lindt Excellence 70% Cacao 100g|95000|365|100 g
262|Bánh quy Oreo Double Stuff thùng 24 gói|285000|270|24 gói
263|Nước uống tăng lực Red Bull 250ml thùng 24 lon|385000|365|24 x 250 ml
264|Protein Whey ON Gold Standard 2lb Double Chocolate|1090000|730|907 g
265|BCAA Xtend Original 30 lần dùng Watermelon|990000|730|30 lần dùng
266|Creatine Monohydrate Optimum Nutrition 600g|990000|1095|600 g
267|Dầu gấc TW3 Vinaga 100ml bổ sung vitamin A|125000|730|100 ml
268|Hạt điều rang muối Bình Phước loại A 500g|245000|180|500 g
269|Trà thảo mộc 7 vị Linh Chi Hồng Sâm 20 gói|285000|540|20 gói
270|Bơ đậu phộng Peanut Butter Skippy Creamy 1.36kg|285000|540|1.36 kg
271|Bút bi Pilot G2 0.5mm hộp 12 cây xanh đen đỏ|129000|12|Nhựa, mực gel
272|Bút mực Lamy Safari Fountain Pen Medium Nib|890000|1|Nhựa ABS, ngòi thép
273|Bút highlight Zebra Mildliner 15 màu|390000|15|Nhựa
274|Bộ bút màu Tombow Dual Brush Pen 10 màu cơ bản|490000|10|Nhựa, đầu cọ nylon
275|Sổ tay Leuchtturm1917 A5 Dotted Hardcover 249 trang|390000|1|Giấy 80gsm, bìa cứng
276|Sổ Moleskine Classic Notebook A5 Ruled 240 trang|390000|1|Giấy không axit, bìa cứng
277|Máy tính Casio FX-991EX ClassWiz 552 functions|490000|1|Nhựa ABS
278|Máy in Canon PIXMA G3470 MegaTank WiFi In+Scan+Copy|5990000|1|Nhựa ABS
279|Mực in Canon GI-790 4 màu CMYK cho G-series|890000|4|Mực dye
280|Giấy in A4 Double A 70gsm Thái Lan 500 tờ|89000|500|Giấy 70gsm
281|Bảng trắng từ tính Deli 90x120cm có khung nhôm|890000|1|Khung nhôm, mặt từ tính
282|Kẹp file nhựa Deli A4 hộp 12 cái nhiều màu|89000|12|Nhựa PP
283|Băng dán trong suốt 3M Scotch Magic Tape 810 19mm×32.9m|69000|1|Màng acetate
284|Ghim bấm Staple Max 23/10 1000 cái cho máy bấm lớn|89000|1000|Thép mạ kẽm
285|Máy hủy giấy Texet TX-520 Cross Cut A4|1890000|1|Thép, nhựa ABS
286|Đèn bàn làm việc Xiaomi Mi LED Desk Lamp 1S|1290000|1|Nhôm, nhựa PC
287|Bàn di chuột Logitech Desk Mat Studio Series|890000|1|Vải polyester, đế cao su
288|Kệ sách để bàn thép chữ L Deli 2 tầng A4|490000|1|Thép sơn tĩnh điện
289|Máy dập ghim Rapid Supreme HD210 25 tờ|890000|1|Kim loại
290|Thước kẻ thép inox không rỉ 30cm Staedtler|129000|1|Thép không gỉ
291|Bút xóa nước Pentel Correction Pen ZL62|89000|1|Nhựa, dung dịch xóa
292|Post-it Notes 3M 76x76mm 12 màu 100 tờ/màu|390000|1200|Giấy
293|Túi đựng tài liệu A4 chống thấm Samsonite Airglow|1290000|1|Nylon chống thấm
294|Màn hình phụ portable ASUS ZenScreen MB16AC 15.6 FHD|7990000|1|Nhôm, kính
295|Hub USB-C Anker 7-in-1 A8346 4K HDMI PD100W|1490000|1|Nhôm
296|Webcam 4K Logitech Brio Ultra HD 4096x2160|5990000|1|Nhựa, kính quang học
297|Máy scan tài liệu Brother ADS-1700W WiFi Duplex|6990000|1|Nhựa ABS
298|Hộp đựng bút để bàn gỗ sồi 6 ngăn handmade|490000|1|Gỗ sồi
299|Ghế lười Beanbag XXL nhồi hạt xốp EPS|1890000|1|Vải nỉ, hạt xốp EPS
300|Máy đếm tiền XIUDIAN 600E tự động phát hiện tiền giả|2490000|1|Nhựa ABS, thép
"""


def describe(category_id, name, a, b):
    """Short Vietnamese description built from the category-specific attributes."""
    return {
        1: f"{name} của tác giả {a}, do {b} phát hành. Sách mới 100%, bọc màng co, giao nhanh toàn quốc.",
        2: f"{name} chính hãng {a}, bảo hành {b} tháng tại trung tâm uỷ quyền. Hàng mới nguyên seal, hỗ trợ trả góp 0%.",
        3: f"{name}, size {a}, màu {b}. Hàng chính hãng, đổi size miễn phí trong 7 ngày.",
        4: f"{name}. Chất liệu {a.lower()}, kích thước {b}. Phù hợp cho căn hộ và nhà phố hiện đại.",
        5: f"{name} dành cho bộ môn {a.lower()}, trọng lượng {b}. Thiết kế bền bỉ cho người tập luyện thường xuyên.",
        6: f"{name}. Thành phần nổi bật: {a}. Quy cách: {b}. Hàng chính hãng, có tem phụ tiếng Việt.",
        7: f"{name}, độ tuổi khuyến nghị {a}, số người chơi {b}. Đồ chơi an toàn, đạt chuẩn chất lượng quốc tế.",
        8: f"{name} cho {a.lower()}, tương thích: {b}. Lắp đặt dễ dàng, bảo hành chính hãng.",
        9: f"{name}, khối lượng {b}, hạn sử dụng {a} ngày kể từ ngày sản xuất. Bảo quản nơi khô ráo, thoáng mát.",
        10: f"{name}. Chất liệu {a[0].lower() + a[1:] if a else a}, quy cách {b} sản phẩm/bộ. Phù hợp cho văn phòng và học tập.",
    }[category_id]


def isbn13(seq):
    body = f"978604{seq:06d}"
    check = (10 - sum(int(d) * (1 if i % 2 == 0 else 3) for i, d in enumerate(body)) % 10) % 10
    return body + str(check)


# Review text per star rating; a short category remark is appended for variety.
REVIEW_TEXTS = {
    5: ["Sản phẩm tuyệt vời, đúng như mô tả.", "Rất hài lòng, sẽ ủng hộ shop dài dài.", "Chất lượng vượt mong đợi, đóng gói cẩn thận.",
        "Giao hàng nhanh, hàng chính hãng. 10 điểm!", "Mua lần thứ hai rồi, vẫn rất ưng ý."],
    4: ["Sản phẩm tốt, giá hợp lý.", "Hàng ổn, giao hơi chậm một chút.", "Chất lượng tốt, đóng gói chắc chắn.",
        "Dùng được một thời gian, khá hài lòng.", "Đúng mô tả, sẽ mua lại."],
    3: ["Sản phẩm tạm ổn so với giá tiền.", "Bình thường, không có gì đặc biệt.", "Dùng được, nhưng chưa thật sự ấn tượng."],
    2: ["Chất lượng chưa như kỳ vọng.", "Hàng giao bị móp hộp, sản phẩm thì tạm được."],
    1: ["Không hài lòng, sản phẩm khác mô tả."],
}
CATEGORY_REMARKS = {
    1: ["Nội dung hay, in rõ nét.", "Giấy đẹp, dịch mượt."], 2: ["Máy chạy mượt.", "Pin trâu, hiệu năng tốt."],
    3: ["Mặc vừa form.", "Vải mát, đường may đẹp."], 4: ["Lắp đặt dễ dàng.", "Hợp với không gian nhà mình."],
    5: ["Tập luyện rất thoải mái.", "Bền, chắc chắn."], 6: ["Da cải thiện rõ sau 2 tuần.", "Mùi dễ chịu, thấm nhanh."],
    7: ["Bé nhà mình rất thích.", "Chơi cùng gia đình rất vui."], 8: ["Lắp vừa xe mình.", "Dùng ổn định."],
    9: ["Hàng tươi, date xa.", "Vị ngon, cả nhà đều thích."], 10: ["Dùng cho văn phòng rất tiện.", "Chất lượng tốt so với giá."],
}
VIRTUAL_COUNT, VIRTUAL_RATING = 5, 5.0  # same Bayesian prior as comment-rate-service


def main():
    rng = random.Random(2025)
    categories = {c[0]: c for c in CATEGORIES}

    rows = [line.split("|") for line in CATALOGUE.strip().splitlines()]
    assert [int(r[0]) for r in rows] == list(range(1, 301)), "catalogue ids must be 1..300"

    with BEHAVIOR_CSV.open(encoding="utf-8") as f:
        events = [e for e in csv.DictReader(f) if e["product_id"]]
    views = Counter(int(float(e["product_id"])) for e in events if e["action"] == "view")
    purchases = {}
    for e in events:
        if e["action"] == "purchase":
            key = (int(e["user_id"]), int(float(e["product_id"])))
            purchases.setdefault(key, e["timestamp"])  # first purchase of that product by that user

    # Reviews: about half of the buyers leave one. Users 1-2 are the seeded admin/staff
    # accounts and 3 is a pre-existing account with a custom username, so skip them.
    quality = {pid: rng.uniform(3.6, 4.9) for pid in range(1, 301)}
    reviews = []
    for (user_id, pid), ts in sorted(purchases.items()):
        if user_id <= 3 or rng.random() > 0.5:
            continue
        stars = max(1, min(5, round(rng.gauss(quality[pid], 0.8))))
        cat_id = (pid - 1) // 30 + 1
        text = f"{rng.choice(REVIEW_TEXTS[stars])} {rng.choice(CATEGORY_REMARKS[cat_id])}" if stars >= 3 else rng.choice(REVIEW_TEXTS[stars])
        created = datetime.fromisoformat(ts) + timedelta(days=rng.randint(2, 10), hours=rng.randint(0, 12))
        reviews.append({
            "product_id": pid, "user_id": user_id, "username": f"user{user_id:02d}",
            "rating": stars, "comment_text": text, "created_at": created.isoformat(timespec="seconds"),
        })

    stars_by_product = {}
    for r in reviews:
        stars_by_product.setdefault(r["product_id"], []).append(r["rating"])

    products = []
    for pid_str, name, price, a, b in rows:
        pid = int(pid_str)
        cat_id, _, prefix, relation, f1, f2 = categories[(pid - 1) // 30 + 1]
        detail = {f1: int(a) if f1 in INT_FIELDS else a, f2: int(b) if f2 in INT_FIELDS else b}
        if relation == "book":
            detail["isbn"] = isbn13(pid)
        stars = stars_by_product.get(pid, [])
        rating = round((sum(stars) + VIRTUAL_COUNT * VIRTUAL_RATING) / (len(stars) + VIRTUAL_COUNT), 2) if stars else 0
        products.append({
            "id": pid,
            "name": name,
            "sku": f"{prefix}-{pid:04d}",
            "description": describe(cat_id, name, a, b),
            "price": f"{int(price)}.00",
            "discount": rng.choice([0, 0, 0, 0, 0, 5, 10, 10, 15, 20]),
            "stock": rng.choice([0, 3, 8]) if rng.random() < 0.05 else rng.randint(15, 250),
            "rating": rating,
            "views": views.get(pid, 0),
            "category": cat_id,
            "detail_type": relation,
            "details": detail,
        })

    for path, data in ((PRODUCTS_OUT, products), (REVIEWS_OUT, reviews)):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"wrote {len(data):>4} rows -> {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
