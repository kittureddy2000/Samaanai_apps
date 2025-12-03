module.exports = {
  expo: {
    name: "samaanai-mobile",
    slug: "samaanai-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: false,
    scheme: "samaanai",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      bundleIdentifier: "com.samaanai.mobile",
      supportsTablet: true
    },
    android: {
      package: "com.samaanai.mobile",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      permissions: [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "READ_MEDIA_IMAGES"
      ],
      intentFilters: [
        {
          action: "android.intent.action.VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "samaanai",
              host: "auth-callback"
            }
          ],
          category: ["android.intent.category.DEFAULT", "android.intent.category.BROWSABLE"]
        }
      ]
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro",
      name: "Samaanai",
      description: "Personal finance and nutrition management platform",
      backgroundColor: "#ffffff"
    },
    extra: {
      API_BASE_URL: process.env.API_BASE_URL || process.env.EXPO_PUBLIC_API_BASE_URL || "https://samaanai-backend-staging-362270100637.us-west1.run.app",
      eas: {
        projectId: "7b2ffe0d-3be0-459b-aec7-39e44d455cbd"
      }
    },
    plugins: [
      [
        "expo-image-picker",
        {
          photosPermission: "The app needs access to your photos to attach images to tasks.",
          cameraPermission: "The app needs access to your camera to take photos for tasks."
        }
      ],
      "expo-web-browser",
      [
        "expo-build-properties",
        {
          android: {
            enableProguardInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
            usesCleartextTraffic: false,
            enableAndroidX: true,
            useAndroidX: true,
            // Enable Jetifier to convert old Android Support libraries to AndroidX
            enableJetifier: true
          }
        }
      ]
    ]
  }
};
