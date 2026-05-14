import Foundation

struct StorefrontAPI {
    private let baseURL = URL(string: "https://store.coryma.me")!
    private let decoder = JSONDecoder()

    func fetchHome() async throws -> HomeResponse {
        try await fetch("/api/home")
    }

    func fetchProducts(category: String? = nil, query: String? = nil, limit: Int = 24) async throws -> ProductsResponse {
        var components = URLComponents(url: baseURL.appending(path: "/api/products"), resolvingAgainstBaseURL: false)!
        var queryItems = [URLQueryItem(name: "limitSize", value: String(limit))]

        if let category, category != "all" {
            queryItems.append(URLQueryItem(name: "category", value: category))
        }

        if let query, !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            queryItems.append(URLQueryItem(name: "q", value: query))
        }

        components.queryItems = queryItems
        return try await fetch(components.url!)
    }

    func fetchProduct(slug: String) async throws -> StorefrontProduct {
        try await fetch("/api/products/\(slug)")
    }

    func imageURL(for product: StorefrontProduct) -> URL? {
        guard let imageUrl = product.imageUrl else {
            return nil
        }

        return absoluteURL(from: imageUrl)
    }

    func imageURL(for hero: HeroFeature?) -> URL? {
        guard let imageUrl = hero?.imageUrl else {
            return nil
        }

        return absoluteURL(from: imageUrl)
    }

    private func fetch<T: Decodable>(_ path: String) async throws -> T {
        try await fetch(baseURL.appending(path: path))
    }

    private func fetch<T: Decodable>(_ url: URL) async throws -> T {
        var request = URLRequest(url: url)
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200..<300).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }

        return try decoder.decode(T.self, from: data)
    }

    private func absoluteURL(from value: String) -> URL? {
        if let url = URL(string: value), url.scheme != nil {
            return url
        }

        return URL(string: value, relativeTo: baseURL)?.absoluteURL
    }
}
