import SwiftUI

struct ContentView: View {
    let api: StorefrontAPI

    var body: some View {
        TabView {
            NavigationStack {
                HomeScreen(api: api)
            }
            .tabItem {
                Label("首頁", systemImage: "house.fill")
            }

            NavigationStack {
                ProductCatalogScreen(api: api)
            }
            .tabItem {
                Label("商品", systemImage: "square.grid.2x2.fill")
            }

            NavigationStack {
                CartScreen(api: api)
            }
            .tabItem {
                Label("購物車", systemImage: "bag.fill")
            }

            NavigationStack {
                AccountDemoScreen()
            }
            .tabItem {
                Label("會員", systemImage: "person.crop.circle.fill")
            }
        }
        .tint(.alpineNavy)
    }
}

struct HomeScreen: View {
    let api: StorefrontAPI

    @EnvironmentObject private var cart: CartStore
    @State private var home: HomeResponse?
    @State private var products = [StorefrontProduct]()
    @State private var isLoading = true
    @State private var errorMessage = ""

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 22) {
                heroSection

                if !products.isEmpty {
                    SectionHeader(title: "今日推薦", subtitle: "從 live storefront API 載入")
                    productRail(products)
                }

                SectionHeader(title: "快速 Demo", subtitle: "原生 iOS 流程")
                demoHighlights
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 24)
        }
        .background(Color.alpineCanvas)
        .navigationTitle("Alpine")
        .toolbarTitleDisplayMode(.large)
        .task(load)
        .overlay {
            if isLoading {
                ProgressView("載入選品中")
                    .controlSize(.large)
            }
        }
    }

    private var heroSection: some View {
        ZStack(alignment: .bottomLeading) {
            AsyncImage(url: api.imageURL(for: home?.heroFeature)) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    LinearGradient(
                        colors: [.alpineNavy, .alpineGreen],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                }
            }
            .frame(height: 360)
            .clipped()

            LinearGradient(
                colors: [.black.opacity(0.72), .black.opacity(0.2), .clear],
                startPoint: .bottom,
                endPoint: .top
            )

            VStack(alignment: .leading, spacing: 12) {
                Text(home?.heroFeature?.label ?? "STORE.CORYMA.ME")
                    .font(.caption.weight(.bold))
                    .tracking(2)
                    .foregroundStyle(.white.opacity(0.75))

                Text(home?.heroFeature?.title ?? "原生 iOS Storefront Demo")
                    .font(.system(size: 38, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(3)

                Text(home?.heroFeature?.body ?? "以 SwiftUI 呈現首頁、商品、購物車與會員情境。")
                    .font(.callout)
                    .foregroundStyle(.white.opacity(0.86))
                    .lineLimit(3)

                NavigationLink {
                    ProductCatalogScreen(api: api)
                } label: {
                    Label("瀏覽商品", systemImage: "arrow.right")
                        .font(.headline)
                        .labelStyle(.titleAndIcon)
                }
                .buttonStyle(.borderedProminent)
                .tint(.white)
                .foregroundStyle(Color.alpineNavy)
                .padding(.top, 4)
            }
            .padding(22)
        }
        .frame(height: 360)
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .shadow(color: .black.opacity(0.15), radius: 20, y: 12)
    }

    private func productRail(_ products: [StorefrontProduct]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            LazyHStack(spacing: 14) {
                ForEach(products) { product in
                    NavigationLink {
                        ProductDetailScreen(api: api, product: product)
                    } label: {
                        ProductRailCard(api: api, product: product) {
                            cart.add(product)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .scrollTargetLayout()
        }
        .scrollTargetBehavior(.viewAligned)
    }

    private var demoHighlights: some View {
        VStack(spacing: 12) {
            DemoHighlightRow(icon: "iphone", title: "原生 App Target", detail: "可以在 iOS Simulator 從 app icon 開啟。")
            DemoHighlightRow(icon: "cloud", title: "Live Storefront API", detail: "商品與推薦內容直接來自 store.coryma.me。")
            DemoHighlightRow(icon: "bag.badge.plus", title: "Demo Cart", detail: "可加入購物車並展示結帳完成流程。")
        }
    }

    @Sendable
    private func load() async {
        guard isLoading else {
            return
        }

        do {
            async let homeResponse = api.fetchHome()
            async let productResponse = api.fetchProducts(limit: 8)
            let loaded = try await (homeResponse, productResponse)
            home = loaded.0
            products = loaded.1.items
        } catch {
            errorMessage = "暫時無法載入 storefront API。"
        }

        isLoading = false
    }
}

struct ProductCatalogScreen: View {
    let api: StorefrontAPI

    @State private var products = [StorefrontProduct]()
    @State private var categories = [SideCategory]()
    @State private var selectedCategory = "all"
    @State private var searchText = ""
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 18) {
                TextField("搜尋商品", text: $searchText)
                    .textFieldStyle(.roundedBorder)
                    .submitLabel(.search)
                    .onSubmit {
                        Task { await loadProducts() }
                    }

                categoryPicker

                if isLoading {
                    ProgressView()
                        .frame(maxWidth: .infinity, minHeight: 160)
                } else {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: 14)], spacing: 14) {
                        ForEach(products) { product in
                            NavigationLink {
                                ProductDetailScreen(api: api, product: product)
                            } label: {
                                ProductGridCard(api: api, product: product)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
            .padding(18)
        }
        .background(Color.alpineCanvas)
        .navigationTitle("商品")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task { await loadProducts() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
            }
        }
        .task {
            await loadProducts()
        }
        .refreshable {
            await loadProducts()
        }
    }

    private var categoryPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(categories.isEmpty ? [SideCategory(id: "all", label: "全部商品", caption: "", icon: nil)] : categories) { category in
                    Button {
                        selectedCategory = category.id
                        Task { await loadProducts() }
                    } label: {
                        Text(category.label)
                            .font(.subheadline.weight(.semibold))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 9)
                            .background(selectedCategory == category.id ? Color.alpineNavy : Color.white)
                            .foregroundStyle(selectedCategory == category.id ? Color.white : Color.alpineNavy)
                            .clipShape(Capsule())
                    }
                }
            }
        }
    }

    @MainActor
    private func loadProducts() async {
        isLoading = true

        do {
            let response = try await api.fetchProducts(
                category: selectedCategory,
                query: searchText,
                limit: 48
            )
            products = response.items
            categories = response.sideCategories
        } catch {
            products = []
        }

        isLoading = false
    }
}

struct ProductDetailScreen: View {
    let api: StorefrontAPI
    let product: StorefrontProduct

    @EnvironmentObject private var cart: CartStore

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                ProductHeroImage(url: api.imageURL(for: product), height: 360)

                VStack(alignment: .leading, spacing: 12) {
                    Text(product.displayCategory)
                        .font(.caption.weight(.bold))
                        .tracking(1.6)
                        .foregroundStyle(.secondary)

                    Text(product.name)
                        .font(.system(size: 30, weight: .black, design: .rounded))

                    Text(product.priceLabel)
                        .font(.title2.weight(.bold))
                        .foregroundStyle(Color.alpineNavy)

                    Text(product.displayDescription)
                        .font(.body)
                        .foregroundStyle(.secondary)
                        .lineSpacing(4)
                }

                if let highlights = product.highlights, !highlights.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("重點")
                            .font(.headline)
                        ForEach(highlights, id: \.self) { highlight in
                            Label(highlight, systemImage: "checkmark.circle.fill")
                                .foregroundStyle(Color.alpineGreen)
                        }
                    }
                }
            }
            .padding(18)
            .padding(.bottom, 96)
        }
        .background(Color.alpineCanvas)
        .navigationTitle("商品詳情")
        .toolbarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Demo Cart")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(product.priceLabel)
                        .font(.headline)
                }

                Spacer()

                Button {
                    cart.add(product)
                } label: {
                    Label("加入購物車", systemImage: "bag.badge.plus")
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .tint(.alpineNavy)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .background(.ultraThinMaterial)
        }
    }
}

struct CartScreen: View {
    let api: StorefrontAPI

    @EnvironmentObject private var cart: CartStore
    @State private var showConfirmation = false

    var body: some View {
        Group {
            if cart.items.isEmpty {
                ContentUnavailableView(
                    "購物車是空的",
                    systemImage: "bag",
                    description: Text("從商品頁加入幾個品項後，就能展示 demo checkout。")
                )
            } else {
                List {
                    ForEach(cart.items, id: \.id) { item in
                        HStack(spacing: 12) {
                            ProductThumb(url: api.imageURL(for: item.product))
                                .frame(width: 74, height: 74)

                            VStack(alignment: .leading, spacing: 6) {
                                Text(item.product.name)
                                    .font(.headline)
                                    .lineLimit(2)
                                Text(item.product.priceLabel)
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(Color.alpineNavy)
                                Stepper("數量 \(item.quantity)") {
                                    cart.add(item.product)
                                } onDecrement: {
                                    cart.decrement(item)
                                }
                                .font(.caption)
                            }
                        }
                        .swipeActions {
                            Button(role: .destructive) {
                                cart.remove(item)
                            } label: {
                                Label("移除", systemImage: "trash")
                            }
                        }
                    }
                }
                .safeAreaInset(edge: .bottom) {
                    VStack(spacing: 12) {
                        HStack {
                            Text("共 \(cart.itemCount) 件商品")
                                .font(.headline)
                            Spacer()
                            Text("Demo 訂單")
                                .foregroundStyle(.secondary)
                        }

                        Button {
                            showConfirmation = true
                        } label: {
                            Text("送出 Demo 訂單")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                        .tint(.alpineNavy)
                    }
                    .padding(18)
                    .background(.ultraThinMaterial)
                }
            }
        }
        .navigationTitle("購物車")
        .sheet(isPresented: $showConfirmation) {
            OrderCompleteView {
                cart.clear()
                showConfirmation = false
            }
            .presentationDetents([.medium])
        }
    }
}

struct AccountDemoScreen: View {
    var body: some View {
        List {
            Section {
                HStack(spacing: 14) {
                    Image(systemName: "person.crop.circle.fill")
                        .font(.system(size: 52))
                        .foregroundStyle(Color.alpineNavy)
                    VStack(alignment: .leading) {
                        Text("Cory Ma")
                            .font(.title3.weight(.bold))
                        Text("Demo member profile")
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 8)
            }

            Section("Demo 能展示") {
                Label("會員推薦商品", systemImage: "sparkles")
                Label("購物車同步情境", systemImage: "arrow.triangle.2.circlepath")
                Label("Data Cloud 行為追蹤故事", systemImage: "chart.line.uptrend.xyaxis")
            }
        }
        .navigationTitle("會員")
    }
}

struct ProductRailCard: View {
    let api: StorefrontAPI
    let product: StorefrontProduct
    let onAdd: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            ProductHeroImage(url: api.imageURL(for: product), height: 150)

            Text(product.displayCategory)
                .font(.caption2.weight(.bold))
                .tracking(1.1)
                .foregroundStyle(.secondary)

            Text(product.name)
                .font(.headline)
                .lineLimit(2)
                .frame(height: 44, alignment: .topLeading)

            HStack {
                Text(product.priceLabel)
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(Color.alpineNavy)

                Spacer()

                Button(action: onAdd) {
                    Image(systemName: "plus")
                        .font(.headline)
                }
                .buttonStyle(.borderedProminent)
                .tint(.alpineNavy)
                .clipShape(Circle())
            }
        }
        .padding(12)
        .frame(width: 220)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .shadow(color: .black.opacity(0.08), radius: 16, y: 8)
    }
}

struct ProductGridCard: View {
    let api: StorefrontAPI
    let product: StorefrontProduct

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            ProductHeroImage(url: api.imageURL(for: product), height: 145)
            Text(product.name)
                .font(.headline)
                .lineLimit(2)
                .frame(height: 44, alignment: .topLeading)
            Text(product.priceLabel)
                .font(.subheadline.weight(.bold))
                .foregroundStyle(Color.alpineNavy)
        }
        .padding(10)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .shadow(color: .black.opacity(0.06), radius: 12, y: 6)
    }
}

struct ProductHeroImage: View {
    let url: URL?
    let height: CGFloat

    var body: some View {
        ProductThumb(url: url)
            .frame(maxWidth: .infinity)
            .frame(height: height)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

struct ProductThumb: View {
    let url: URL?

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.alpineCanvas, Color.alpineMist],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFit()
                        .padding(8)
                case .failure:
                    Image(systemName: "photo")
                        .font(.largeTitle)
                        .foregroundStyle(.secondary)
                default:
                    ProgressView()
                }
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct SectionHeader: View {
    let title: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.title2.weight(.black))
            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}

struct DemoHighlightRow: View {
    let icon: String
    let title: String
    let detail: String

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(.white)
                .frame(width: 46, height: 46)
                .background(Color.alpineNavy)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.headline)
                Text(detail)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding(14)
        .background(Color.white)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

struct OrderCompleteView: View {
    let onDone: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 70))
                .foregroundStyle(Color.alpineGreen)

            Text("Demo 訂單已送出")
                .font(.title2.weight(.black))

            Text("這裡可以接 Salesforce checkout、Data Cloud event 或客戶 demo 的下一段故事。")
                .font(.body)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)

            Button("完成", action: onDone)
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .tint(.alpineNavy)
        }
        .padding(28)
    }
}

extension Color {
    static let alpineNavy = Color(red: 0.012, green: 0.086, blue: 0.208)
    static let alpineGreen = Color(red: 0.145, green: 0.365, blue: 0.231)
    static let alpineCanvas = Color(red: 0.95, green: 0.955, blue: 0.96)
    static let alpineMist = Color(red: 0.87, green: 0.90, blue: 0.92)
}
