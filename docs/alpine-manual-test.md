# Alpine Demo Storefront 手動測試指南

## 範圍

本文件用來手動驗證 Alpine demo storefront 的目前交付內容：

- Experience / LWR shell
- 首頁
- 商品列表頁
- 商品詳頁
- 假購物車頁
- request 提交流程
- Alpine Admin 後台管理
- guest 最小權限 smoke test

不包含：

- Salesforce Commerce 標準 cart / checkout
- 真正下單、出貨、付款

## 測試前準備

### 1. 確認站點網址

請先確認實際發佈後的站點 base URL。

本 bundle 的 site `urlName` 是 `alpine-demo-storefront`，若用預設 path，通常會是：

```text
https://<your-domain>/alpine-demo-storefront
```

以下步驟中的 `<SITE_BASE_URL>` 都請替換成實際站點網址。

### 2. 確認商品資料已準備好

至少準備 3 到 5 筆商品，並符合以下條件：

- `Product2.IsActive = true`
- `Product2.Show_on_Alpine__c = true`
- 商品在 demo price book 內有 `PricebookEntry`
- `PricebookEntry.IsActive = true`
- 建議有：
  - `Alpine_Category__c`
  - `Alpine_Sort_Order__c`
  - `Alpine_Short_Description__c`
  - `Alpine_Badge__c`
  - `DisplayUrl`

### 3. 建議先準備一筆測試商品資訊

請先記下其中一筆商品的：

- `Product Id`
- `Product Code / SKU`
- `Name`
- `slug`

說明：

- `slug` 通常由商品名稱自動轉成小寫加連字號。
- 如果不確定 slug，先從列表頁點進商品詳頁，再從 URL 抄下來。

### 4. guest 測試請用無痕視窗

前台 guest 測試請使用無痕視窗，避免受到登入狀態或既有 localStorage 汙染。

### 5. 若要重跑 cart/request 測試，先清空 localStorage

在瀏覽器 console 執行：

```js
localStorage.removeItem('demo-cart-v1');
```

## 後台資料準備測試

### A. Alpine Admin 可用性

1. 用內部使用者登入 org。
2. 開啟 App Launcher。
3. 搜尋並進入 `Alpine Admin`。

預期結果：

- 可看到 `Products` tab。
- 可進入 `Alpine Storefront Admin` list view。

### B. 商品欄位可維護

1. 打開一筆測試商品。
2. 在商品頁確認以下欄位可編輯：
   - `Show on Alpine`
   - `Alpine Sort Order`
   - `Alpine Category`
   - `Alpine Badge`
   - `Alpine Short Description`
3. 修改後儲存。

預期結果：

- 欄位可成功儲存。
- 修改後前台會反映在對應頁面。

### C. 上架與排序驗證

1. 將某一筆商品 `Show on Alpine` 設為 `false`。
2. 重新整理前台 `/products`。
3. 再把它改回 `true`。
4. 調整兩筆商品的 `Alpine Sort Order`，例如一筆設成 `1`，另一筆設成 `50`。
5. 回前台重新整理。

預期結果：

- `Show on Alpine = false` 的商品不應出現在列表頁。
- 較小的 `Alpine Sort Order` 應在 `featured` 排序下更前面。

## Guest 前台 Smoke Test

### A. 首頁

1. 用無痕視窗開啟 `<SITE_BASE_URL>/`

預期結果：

- 頁面可正常載入。
- Header / Footer 存在。
- 首頁 hero、featured products、brand story、FAQ teaser 可見。
- 不出現 Apex class access error。

### B. 商品列表頁

1. 開啟 `<SITE_BASE_URL>/products`

預期結果：

- 商品列表可載入。
- 至少看到你準備好的上架商品。
- 商品卡會顯示名稱、價格、分類或簡述。

### C. 搜尋

1. 在列表頁搜尋框輸入完整商品名的一部分。
2. 再試 SKU 關鍵字。
3. 再試簡述中的關鍵字。

預期結果：

- 搜尋結果會縮小。
- 若沒有符合結果，頁面應顯示 empty state，不應噴錯。

### D. 分類篩選

1. 在列表頁切換不同 category。
2. 至少測試：
   - `All`
   - 1 個有商品的 category
   - 1 個與另一筆商品不同的 category

預期結果：

- 切換 category 後，列表會正確縮小。
- 回到 `All` 後，全部可售 demo 商品會回來。

### E. 排序

1. 在列表頁切換排序：
   - `Featured`
   - `Name: A to Z`
   - `Price: Low to High`
   - `Price: High to Low`
   - `Newest`

預期結果：

- 商品順序會變化。
- `Featured` 會受 `Alpine Sort Order` 影響。

## 商品詳頁測試

### A. 從列表點進詳頁

1. 在 `/products` 點一筆商品卡。

預期結果：

- 可進入商品詳頁。
- 頁面顯示：
  - 商品名稱
  - 價格
  - 描述
  - 圖片
  - badge
  - features / FAQ（若資料有帶出）

### B. 直接用 `productId` 測試

1. 開啟：

```text
<SITE_BASE_URL>/product?productId=<PRODUCT_ID>
```

預期結果：

- 正確載入該商品。

### C. 直接用 `productSlug` 測試

1. 開啟：

```text
<SITE_BASE_URL>/product?productSlug=<PRODUCT_SLUG>
```

預期結果：

- 正確載入該商品。

### D. 直接用 `sku` 測試

1. 開啟：

```text
<SITE_BASE_URL>/product?sku=<PRODUCT_SKU>
```

預期結果：

- 正確載入該商品。

### E. 無效商品參數

1. 開啟：

```text
<SITE_BASE_URL>/product?productId=01t000000000000AAA
```

預期結果：

- 畫面顯示錯誤訊息或 not found 狀態。
- 不應整頁白屏。

## Cart / Request 測試

### 重要說明

目前 `PDP -> Add to cart` 尚未真正寫入 `demoCartStore`。

現況預期是：

- 點 `Add to cart` 不應噴錯。
- 頁面可能顯示 pending integration 訊息。
- 若要完整測 `cart` / `request`，請先手動注入 localStorage 測試資料。

### A. PDP add-to-cart 現況檢查

1. 在商品詳頁點 `Add to cart`。

預期結果：

- 不應出現 JS error 或 LWC crash。
- 頁面會顯示目前的整合狀態訊息。

### B. 手動注入 cart 測試資料

在無痕視窗 console 執行：

```js
localStorage.setItem(
  'demo-cart-v1',
  JSON.stringify({
    items: [
      {
        id: 'manual-1',
        productId: 'REPLACE_PRODUCT_ID',
        sku: 'REPLACE_SKU',
        name: 'Alpine - Oat Cereal',
        subtitle: 'Manual smoke test item',
        imageUrl: 'https://sfdc-ckz-b2b.s3.amazonaws.com/RCG/CG/Alpine+Products/cereal/oatcereal.jpg',
        unitPrice: 4.99,
        quantity: 2,
        currencyIsoCode: 'USD',
        attributes: ['Guest smoke test']
      }
    ]
  })
);
location.assign('<SITE_BASE_URL>/cart');
```

### C. Cart 頁

1. 開啟 `<SITE_BASE_URL>/cart`

預期結果：

- 可看到剛剛注入的商品。
- 顯示品名、數量、單價、line total、總金額。
- 可調整數量。
- 可移除商品。
- 點 `Continue to Request` 可導去 `/request`。

### D. Request 頁

1. 開啟 `<SITE_BASE_URL>/request`
2. 確認表單欄位存在：
   - Name
   - Email
   - Phone
   - Note
3. 輸入有效資料並送出。

建議測試資料：

- Name: `Ada Lovelace`
- Email: `ada@example.com`
- Phone: `+1 415 555 0100`
- Note: `Need the delivery lead time.`

預期結果：

- 送出成功後顯示 success message。
- Submitted Items 區塊會顯示 cart 明細。
- localStorage cart 會被清空。

### E. Request 表單驗證

1. 空白送出。
2. 輸入無效 email，例如 `abc`
3. 輸入無效 phone，例如 `12`

預期結果：

- 表單驗證要擋下無效資料。
- 不應建立 Lead。

## 後台 Lead 驗證

1. 用內部使用者登入 Salesforce。
2. 到 `Leads`。
3. 找最新建立的 lead。

預期結果：

- 有新增一筆 lead。
- `Company = Demo Cart Request`
- `Email`、`Phone` 與送出資料一致。
- `Description` 包含：
  - customer name
  - email
  - phone
  - total
  - cart item 明細
  - note

## Guest 權限 Smoke Test

### A. Guest 正常讀取與提交

請用無痕視窗重跑以下流程：

1. 開首頁
2. 開 `/products`
3. 搜尋 / 分類 / 排序
4. 開商品詳頁
5. 開 `/cart`
6. 開 `/request`
7. 送出 request

預期結果：

- 商品頁與 request flow 正常。
- 不需要登入。
- 不出現 Apex class access error。

### B. 權限 audit

可在本機執行：

```bash
python3 scripts/audit_alpine_guest_access.py --site-name B2C_Alpine_group
```

若要補齊必要 Apex class access：

```bash
python3 scripts/audit_alpine_guest_access.py \
  --site-name B2C_Alpine_group \
  --apply-required-apex-access
```

## 建議回歸測試

每次改完商品欄位、Apex API、或 guest 權限後，至少重跑以下項目：

1. 首頁 featured products 是否正常顯示。
2. `/products` 是否仍可載入。
3. 搜尋、分類、排序是否仍正常。
4. `/product?productId=...` 是否仍可載入。
5. `/request` 表單是否仍可送出。
6. 新 Lead 是否仍正確建立。

## 已知限制

- `Add to cart` 目前仍是 pending integration，尚未正式把 PDP 按鈕接到 `demoCartStore.upsertItem()`。
- 因此 cart / request 的完整手測目前需要先手動注入 localStorage。
- 這不影響商品列表、商品詳頁、request 提交、admin 管理與 guest Apex access 的驗證。
