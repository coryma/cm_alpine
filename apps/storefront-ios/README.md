# Alpine Store iOS Demo

SwiftUI demo app for `store.coryma.me`.

## What is included

- Native SwiftUI app target: `AlpineStoreDemo`
- Bottom tabs: Home, Products, Cart, Account
- Live API reads from `https://store.coryma.me`
- Product list, product detail, in-memory cart, and demo order completion

## Run in Xcode

1. Open `apps/storefront-ios/AlpineStoreDemo.xcodeproj`.
2. Select the `AlpineStoreDemo` scheme.
3. Select an iPhone simulator, for example `iPhone 17 Pro`.
4. Press Run.

## Run from CLI

```sh
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcrun simctl boot "iPhone 17 Pro" || true
open -a Simulator

DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild \
  -project apps/storefront-ios/AlpineStoreDemo.xcodeproj \
  -scheme AlpineStoreDemo \
  -destination "platform=iOS Simulator,name=iPhone 17 Pro" \
  -configuration Debug \
  CODE_SIGNING_ALLOWED=NO \
  build
```

After the build, Xcode can run the app directly. For a CLI launch, install the
`.app` from DerivedData and launch bundle id `me.coryma.store.demo`.
