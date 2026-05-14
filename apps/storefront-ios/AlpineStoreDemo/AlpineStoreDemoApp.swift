import SwiftUI

@main
struct AlpineStoreDemoApp: App {
    @StateObject private var cart = CartStore()
    private let api = StorefrontAPI()

    var body: some Scene {
        WindowGroup {
            ContentView(api: api)
                .environmentObject(cart)
        }
    }
}
