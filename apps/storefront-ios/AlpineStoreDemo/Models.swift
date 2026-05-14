import Foundation

struct ProductsResponse: Decodable {
    let items: [StorefrontProduct]
    let total: Int
    let sideCategories: [SideCategory]
}

struct HomeResponse: Decodable {
    let heroFeature: HeroFeature?
    let recommended: [StorefrontProduct]?
    let flashSale: [StorefrontProduct]?
    let premiumTechnology: [StorefrontProduct]?
    let sideCategories: [SideCategory]?
}

struct HeroFeature: Decodable {
    let label: String
    let title: String
    let body: String
    let imageUrl: String
    let alt: String
}

struct SideCategory: Decodable, Identifiable, Hashable {
    let id: String
    let label: String
    let caption: String
    let icon: String?
}

struct StorefrontProduct: Decodable, Identifiable, Hashable {
    let id: String
    let slug: String
    let categoryId: String?
    let categoryLabel: String?
    let label: String?
    let name: String
    let kicker: String?
    let priceLabel: String
    let description: String?
    let longDescription: String?
    let highlights: [String]?
    let specs: [ProductSpec]?
    let imageUrl: String?
    let imageAlt: String?

    var displayCategory: String {
        categoryLabel ?? label ?? categoryId ?? "ALPINE"
    }

    var displayDescription: String {
        longDescription ?? description ?? "精選商品，適合 iOS demo 流程展示。"
    }

    var priceAmount: Int {
        let digits = priceLabel.filter(\.isNumber)
        return Int(digits) ?? 0
    }
}

struct ProductSpec: Decodable, Hashable {
    let label: String?
    let value: String?
}

struct CartItem: Identifiable, Hashable {
    let product: StorefrontProduct
    var quantity: Int

    var id: String {
        product.id
    }
}
