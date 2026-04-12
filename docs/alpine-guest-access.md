# Alpine Demo Storefront Guest 最小權限

## 範圍

本文件只處理 Alpine demo storefront 的 guest 存取面：

- 前台商品讀取：`AlpineProductCatalogController`
- 前台中文 storefront 設定：`AlpineStorefrontConfigController`
- request submit：`DemoCartRequestController`

不包含：

- Experience route 調整
- cart / checkout / Commerce 標準 storefront 權限模型
- guest user sharing / OWD 策略重整

## 目前結果

2026-04-09 於 org `sftw-260331` 已完成：

- 補上 guest profile-owned permission set 的 Apex class access：
  - `AlpineProductCatalogController`
  - `AlpineStorefrontConfigController`
  - `DemoCartRequestController`
- 新增可重跑 audit 腳本：
  - [`scripts/audit_alpine_guest_access.py`](/Users/cory.ma/Projects/260331/scripts/audit_alpine_guest_access.py)

實際套用對象：

- Site: `B2C_Alpine_group` (`0DMKh000000LHHLOA4`)
- Guest User: `B2C - Alpine group Site Guest User` (`005Kh0000050CHbIAM`)
- Guest Profile: `B2C - Alpine group Profile` (`00eKh000000ILBSIA4`)
- Profile-owned Permission Set: `0PSKh0000006G5UOAU`

可重跑驗證：

```bash
python3 scripts/audit_alpine_guest_access.py --site-name B2C_Alpine_group
```

若要補齊必需 Apex class access：

```bash
python3 scripts/audit_alpine_guest_access.py \
  --site-name B2C_Alpine_group \
  --apply-required-apex-access
```

## 最小權限目標

Alpine demo storefront 目前商品與 request flow 都走自家 Apex，而不是 Commerce storefront/cart/search。以現在的程式碼來看，guest 最小權限模型應收斂成：

- Apex class access：
  - `AlpineProductCatalogController`
  - `AlpineStorefrontConfigController`
  - `DemoCartRequestController`
- Direct object access：
  - `Product2`: 不需要
  - `Pricebook2`: 不需要
  - `PricebookEntry`: 不需要
  - `Lead`: 不需要
- Direct field access：
  - `Product2`: 不需要
  - `PricebookEntry`: 不需要
  - `Lead`: 不需要

原因：

- 商品頁與商品詳頁透過 `@salesforce/apex` 呼叫 `AlpineProductCatalogController`，資料查詢在 Apex 內完成。
- request submit 透過 `DemoCartRequestController.submitRequest()` 建立 `Lead`，不依賴 guest 對 `Lead` 的直接 CRUD/FLS。

## 目前觀察到的過寬權限

audit 結果顯示目前 guest 仍有額外 Commerce 權限：

- 非 profile-owned permission sets 仍掛在 guest user 上：
  - `D2C Commerce - Guest User Access`
  - `SDO Salesforce Commerce - Guest Access`
- 這兩個 permission sets 直接給了 `Product2` read access。
- guest profile-owned permission set 仍暴露部分 `Lead` / `Product2` field access。

目前已知直接暴露的重點如下：

- `Product2` direct object read：
  - `D2C_Commerce_Guest_User_Access`
  - `SDO_B2B_Commerce_Guest_Access`
- `Lead` direct field access：
  - `Lead.Description`
  - `Lead.Email`
  - `Lead.Phone`
- `Product2` direct field access：
  - `Product2.Description`
  - `Product2.DisplayUrl`
  - `Product2.Family`
  - `Product2.ProductCode`

此外，audit 也抓到大量與 Alpine storefront 無關的 `Product2` custom/package fields 仍對 guest 可讀，這些都屬於最小權限模型外的暴露。

## 設定清單

以下是建議的 guest 收斂順序。

1. 保留 guest 必需 Apex class access。
   - `AlpineProductCatalogController`
   - `AlpineStorefrontConfigController`
   - `DemoCartRequestController`
   - 這兩個 access 已補到 profile-owned permission set。

2. 檢查 guest user 的額外 permission set assignments。
   - 目標是只保留 profile-owned permission set，或改成一個明確的 Alpine minimal guest permission set。
   - 若同一個 site 已不再依賴 Commerce 標準 storefront 元件，可移除：
     - `D2C Commerce - Guest User Access`
     - `SDO Salesforce Commerce - Guest Access`

3. 清掉 direct object access。
   - `Product2` read 應移除。
   - `Pricebook2` / `PricebookEntry` / `Lead` 不應額外打開。

4. 清掉 direct field access。
   - `Lead` 不應保留 `Email` / `Phone` / `Description` 等直接 FLS。
   - `Product2` 不應保留直接欄位讀取，尤其是與 Alpine 無關的 package/custom fields。

5. 每做一步都跑 smoke test。
   - 先驗證 products/detail/request 都正常，再移除下一層權限。

## Smoke Test Checklist

建議用 guest 視角實測，並在每次移除 permission set / object / field access 後重跑。

- 開啟首頁，featured products 能正常顯示，不出現 Apex access error。
- 開啟 `/products`，商品列表能載入。
- 在 `/products` 測試 search，結果能依關鍵字縮小。
- 在 `/products` 測試 category filter，能切換分類。
- 在 `/products` 測試 sort，至少驗證 `featured`、`nameAsc`、`priceAsc`。
- 點進商品詳頁，能用 `productId` 載入。
- 商品詳頁改用 `sku` 載入，資料正確。
- 商品詳頁改用 `slug` 載入，資料正確。
- 商品詳頁的 add-to-cart 仍維持現有 adapter seam，不應噴 request submit 相關錯誤。
- 開啟 `/request`，表單可正常輸入。
- 送出 request 成功，畫面收到 success message。
- 後台確認新增一筆 `Lead`，`Company = Demo Cart Request`，`Description` 含 cart item 與 note。
- 用 guest 視角重新檢查 console / network，不應出現直接讀 `Product2` 或 `Lead` 的前端 API 需求。

## 風險備註

- `AlpineProductCatalogController` / `AlpineProductCatalogService` 目前是 `without sharing`，且沒有做 CRUD/FLS enforcement。
- `DemoCartRequestController` 雖然是 `with sharing`，但同樣沒有做 CRUD/FLS enforcement；guest 是否能寫 `Lead`，目前實際上依賴 Apex system-mode 行為，而不是 direct `Lead` 權限。
- 這代表最小權限可以靠「只開 class access、不要開 direct object/FLS」達成，但也表示日後若 controller 增加查詢或寫入欄位，guest 可經由 Apex 間接碰到更多資料。
- 若同一個 site 還殘留 Commerce/B2B 元件、CMS card、標準 PDP/PLP 或其他 managed package 元件，移除 `D2C Commerce - Guest User Access` / `SDO Salesforce Commerce - Guest Access` 可能會連帶打壞那些元件。
- 目前 repo 沒有 guest profile / permission set metadata，因此這次交付以「org 內 class access 已補上 + repo 內 audit script + 明確設定清單」為主。若要長期控管，建議後續把 guest 權限切到可版本化的 permission set metadata 或補一條 org setup automation。
