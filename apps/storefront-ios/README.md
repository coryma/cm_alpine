# Alpine Store iOS Demo

SwiftUI demo app for `store.coryma.me`.

## What is included

- Native SwiftUI app target: `AlpineStoreDemo`
- Bottom tabs: Home, Products, Cart, Account
- Live API reads from `https://store.coryma.me`
- Product list, product detail, in-memory cart, and demo order completion
- Simulated app push: when the cart first crosses NT$3,000, the app sends a
  local notification with product context and discount code `ALPINE300`

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

## Demo the simulated push

1. Launch the app and allow notifications when iOS prompts.
2. Add products until the cart crosses NT$3,000.
3. The app schedules a local notification one second later with:
   - product name
   - product image when iOS accepts the image attachment
   - discount code `ALPINE300`

This is intentionally local-only for the first demo version. It does not call
Appier, APNs, FCM, or Salesforce automation.
