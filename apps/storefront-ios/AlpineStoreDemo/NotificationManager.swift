import Foundation
import UserNotifications

final class NotificationManager: NSObject, ObservableObject, UNUserNotificationCenterDelegate {
    private let discountCode = "ALPINE300"

    override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }

    func requestAuthorization() async {
        do {
            _ = try await UNUserNotificationCenter.current().requestAuthorization(
                options: [.alert, .badge, .sound]
            )
        } catch {
            // Demo notification permission failure should not block shopping flows.
        }
    }

    func sendCartThresholdPush(for product: StorefrontProduct, imageURL: URL?) async {
        let content = UNMutableNotificationContent()
        content.title = "Alpine 專屬折扣已解鎖"
        content.subtitle = product.name
        content.body = "購物車滿 NT$3,000，使用 \(discountCode) 立即折抵。"
        content.sound = .default
        content.badge = 1
        content.userInfo = [
            "discountCode": discountCode,
            "productId": product.id,
            "productSlug": product.slug
        ]

        if let imageURL, let attachment = await makeImageAttachment(from: imageURL) {
            content.attachments = [attachment]
        }

        let request = UNNotificationRequest(
            identifier: "alpine-cart-threshold-\(UUID().uuidString)",
            content: content,
            trigger: UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        )

        do {
            try await UNUserNotificationCenter.current().add(request)
        } catch {
            // Keep this non-fatal; it is only a simulated push for demo.
        }
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .list, .sound, .badge]
    }

    private func makeImageAttachment(from url: URL) async -> UNNotificationAttachment? {
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let httpResponse = response as? HTTPURLResponse,
                  (200..<300).contains(httpResponse.statusCode),
                  let fileExtension = attachmentFileExtension(from: httpResponse, url: url) else {
                return nil
            }

            let fileURL = FileManager.default.temporaryDirectory
                .appendingPathComponent("alpine-push-\(UUID().uuidString)")
                .appendingPathExtension(fileExtension)
            try data.write(to: fileURL, options: [.atomic])
            return try UNNotificationAttachment(identifier: "product-image", url: fileURL)
        } catch {
            return nil
        }
    }

    private func attachmentFileExtension(from response: HTTPURLResponse, url: URL) -> String? {
        let mimeType = response.value(forHTTPHeaderField: "Content-Type")?.lowercased() ?? ""

        if mimeType.contains("png") {
            return "png"
        }

        if mimeType.contains("jpeg") || mimeType.contains("jpg") {
            return "jpg"
        }

        if mimeType.contains("gif") {
            return "gif"
        }

        let pathExtension = url.pathExtension.lowercased()
        return ["png", "jpg", "jpeg", "gif"].contains(pathExtension) ? pathExtension : nil
    }
}
