module.exports = {
  expo: {
    name: "samaanai-mobile",
    slug: "samaanai-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
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
      edgeToEdgeEnabled: true
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro",
      name: "Samaanai",
      description: "Personal finance and nutrition management platform",
      backgroundColor: "#ffffff"
    },
    extra: {
      API_BASE_URL: process.env.API_BASE_URL || "http://localhost:8080",
      eas: {
        projectId: "7b2ffe0d-3be0-459b-aec7-39e44d455cbd"
      }
    }
  }
};
