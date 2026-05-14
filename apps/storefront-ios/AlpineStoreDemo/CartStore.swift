import Foundation

@MainActor
final class CartStore: ObservableObject {
    @Published private(set) var items: [CartItem] = []

    var itemCount: Int {
        items.reduce(0) { $0 + $1.quantity }
    }

    func add(_ product: StorefrontProduct) {
        if let index = items.firstIndex(where: { $0.product.id == product.id }) {
            items[index].quantity += 1
        } else {
            items.append(CartItem(product: product, quantity: 1))
        }
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
    }

    func remove(_ item: CartItem) {
        items.removeAll { $0.id == item.id }
    }

    func clear() {
        items.removeAll()
    }
}
