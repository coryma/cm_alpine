import Foundation

@MainActor
final class CartStore: ObservableObject {
    private let pushThresholdAmount = 3000
    private var didTriggerDiscountPush = false

    @Published private(set) var items: [CartItem] = []

    var itemCount: Int {
        items.reduce(0) { $0 + $1.quantity }
    }

    var estimatedSubtotal: Int {
        items.reduce(0) { $0 + ($1.product.priceAmount * $1.quantity) }
    }

    @discardableResult
    func add(_ product: StorefrontProduct) -> Bool {
        let previousSubtotal = estimatedSubtotal

        if let index = items.firstIndex(where: { $0.product.id == product.id }) {
            items[index].quantity += 1
        } else {
            items.append(CartItem(product: product, quantity: 1))
        }

        let crossedThreshold = previousSubtotal < pushThresholdAmount &&
            estimatedSubtotal >= pushThresholdAmount &&
            !didTriggerDiscountPush

        if crossedThreshold {
            didTriggerDiscountPush = true
        }

        return crossedThreshold
    }

    func decrement(_ item: CartItem) {
        guard let index = items.firstIndex(where: { $0.id == item.id }) else {
            return
        }

        if items[index].quantity <= 1 {
            items.remove(at: index)
        } else {
            items[index].quantity -= 1
        }

        resetDiscountPushIfBelowThreshold()
    }

    func remove(_ item: CartItem) {
        items.removeAll { $0.id == item.id }
        resetDiscountPushIfBelowThreshold()
    }

    func clear() {
        items.removeAll()
        didTriggerDiscountPush = false
    }

    private func resetDiscountPushIfBelowThreshold() {
        if estimatedSubtotal < pushThresholdAmount {
            didTriggerDiscountPush = false
        }
    }
}
