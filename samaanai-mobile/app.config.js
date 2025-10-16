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
      API_BASE_URL: process.env.API_BASE_URL || "https://samaanai-backend-staging-hdp6ioqupa-uc.a.run.app",
      eas: {
        projectId: "7b2ffe0d-3be0-459b-aec7-39e44d455cbd"
      }
    }
  }
};
