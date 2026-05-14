import SwiftUI

@main
struct AlpineStoreDemoApp: App {
    @StateObject private var cart = CartStore()
    @StateObject private var notificationManager = NotificationManager()
    private let api = StorefrontAPI()

    var body: some Scene {
        WindowGroup {
            ContentView(api: api)
                .environmentObject(cart)
                .environmentObject(notificationManager)
                .task {
                    await notificationManager.requestAuthorization()
                }
        }
    }
}
